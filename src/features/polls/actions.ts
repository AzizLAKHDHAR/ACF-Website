'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/guards';
import { formDataToRecord, fromDbError, invalid, ok, type FormState } from '@/lib/forms/state';
import { createClient } from '@/lib/supabase/server';
import { pollIdSchema, pollSchema, voteSchema } from './schemas';

function refresh() {
  revalidatePath('/[locale]/member', 'layout');
  revalidatePath('/[locale]/board', 'layout');
}

/** A member's answers to every slot at once; set_poll_votes() runs under RLS and refuses closed polls. */
export async function votePoll(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = voteSchema.safeParse(formDataToRecord(formData));
  if (!parsed.success) return invalid(parsed.error);
  await requireRole('member');
  const supabase = await createClient();
  const { error } = await supabase.rpc('set_poll_votes', {
    poll: parsed.data.pollId,
    votes: parsed.data.votes,
  });
  if (error) return fromDbError(error, { P0001: 'pollClosed' });
  refresh();
  return ok('voted');
}

/** The board creates an availability poll and its slots (the poll is removed if the slots fail). */
export async function createPoll(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = pollSchema.safeParse(formDataToRecord(formData));
  if (!parsed.success) return invalid(parsed.error);
  await requireRole('board');
  const value = parsed.data;
  const supabase = await createClient();
  const { data: poll, error } = await supabase
    .from('polls')
    .insert({
      title: value.title,
      description_md: value.description,
      kind: 'availability',
      multi: true,
      audience: value.audience,
      closes_at: value.closesAt,
    })
    .select('id')
    .single();
  if (error) return fromDbError(error);
  const { error: optionsError } = await supabase.from('poll_options').insert(
    value.options.map((option, position) => ({
      poll_id: poll.id,
      label: option.label,
      starts_at: option.startsAt,
      ends_at: option.endsAt,
      position,
    })),
  );
  if (optionsError) {
    await supabase.from('polls').delete().eq('id', poll.id);
    return fromDbError(optionsError);
  }
  refresh();
  return ok('created');
}

/** Closing now locks the votes (the database checks `closes_at`). */
export async function closePoll(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = pollIdSchema.safeParse(formDataToRecord(formData));
  if (!parsed.success) return invalid(parsed.error);
  await requireRole('board');
  const now = new Date().toISOString();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('polls')
    .update({ closes_at: now })
    .eq('id', parsed.data.pollId)
    .or(`closes_at.is.null,closes_at.gt."${now}"`)
    .select('id');
  if (error) return fromDbError(error);
  if (!data?.length) return { ok: false, error: 'pollClosed' };
  refresh();
  return ok('closed');
}

export async function deletePoll(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = pollIdSchema.safeParse(formDataToRecord(formData));
  if (!parsed.success) return invalid(parsed.error);
  await requireRole('board');
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('polls')
    .delete()
    .eq('id', parsed.data.pollId)
    .select('id');
  if (error) return fromDbError(error);
  if (!data?.length) return { ok: false, error: 'notFound' };
  refresh();
  return ok('deleted');
}
