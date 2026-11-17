'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/guards';
import { formDataToRecord, fromDbError, invalid, ok, type FormState } from '@/lib/forms/state';
import { createClient } from '@/lib/supabase/server';
import { commentIdSchema, commentSchema, taskIdSchema, taskStatusSchema } from './schemas';

function refresh() {
  revalidatePath('/[locale]/member', 'layout');
}

/** A member takes an open task (the task_assignees policy only allows open, active tasks). */
export async function takeTask(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = taskIdSchema.safeParse(formDataToRecord(formData));
  if (!parsed.success) return invalid(parsed.error);
  const user = await requireRole('member');
  const supabase = await createClient();
  const { error } = await supabase
    .from('task_assignees')
    .insert({ task_id: parsed.data.taskId, user_id: user.id });
  if (error) return fromDbError(error);
  refresh();
  return ok('taken');
}

/** A member leaves a task they are assigned to. */
export async function leaveTask(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = taskIdSchema.safeParse(formDataToRecord(formData));
  if (!parsed.success) return invalid(parsed.error);
  const user = await requireRole('member');
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('task_assignees')
    .delete()
    .eq('task_id', parsed.data.taskId)
    .eq('user_id', user.id)
    .select('task_id');
  if (error) return fromDbError(error);
  if (!data?.length) return { ok: false, error: 'notFound' };
  refresh();
  return ok('left');
}

/** Assignees (and the board) move a task's status through set_task_status(). */
export async function changeTaskStatus(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = taskStatusSchema.safeParse(formDataToRecord(formData));
  if (!parsed.success) return invalid(parsed.error);
  await requireRole('member');
  const supabase = await createClient();
  const { error } = await supabase.rpc('set_task_status', {
    task: parsed.data.taskId,
    new_status: parsed.data.status,
  });
  if (error) return fromDbError(error);
  refresh();
  return ok('statusChanged');
}

/** Members comment on tasks they can read; the author comes from the session (trigger). */
export async function addTaskComment(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = commentSchema.safeParse(formDataToRecord(formData));
  if (!parsed.success) return invalid(parsed.error);
  await requireRole('member');
  const supabase = await createClient();
  const { error } = await supabase
    .from('task_comments')
    .insert({ task_id: parsed.data.taskId, body_md: parsed.data.body });
  if (error) return fromDbError(error);
  refresh();
  return ok('commented');
}

/** Authors delete their own comments; the board deletes any (RLS). */
export async function deleteTaskComment(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = commentIdSchema.safeParse(formDataToRecord(formData));
  if (!parsed.success) return invalid(parsed.error);
  await requireRole('member');
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('task_comments')
    .delete()
    .eq('id', parsed.data.commentId)
    .eq('task_id', parsed.data.taskId)
    .select('id');
  if (error) return fromDbError(error);
  if (!data?.length) return { ok: false, error: 'forbidden' };
  refresh();
  return ok('deleted');
}
