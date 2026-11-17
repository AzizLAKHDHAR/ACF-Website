import 'server-only';
import { cache } from 'react';
import { sessionClient, throwIfError } from '@/lib/supabase/session';

// Tasks as the signed-in user. RLS returns the tasks of their audience plus the ones assigned to
// them; assignees and comments are visible with their task.

const taskColumns = `id, title, status, priority, due_on, is_open, audience, completed_at,
  project:projects(name),
  task_assignees(user_id, assigned_by, account:accounts!task_assignees_user_id_fkey(display_name))` as const;

/** Every readable task that isn't cancelled, split into the user's own, open ones, and the rest. */
export async function listTasks(userId: string) {
  const supabase = await sessionClient();
  if (!supabase) return { mine: [], open: [], others: [] };
  const { data, error } = await supabase
    .from('tasks')
    .select(taskColumns)
    .neq('status', 'cancelled')
    .order('due_on', { ascending: true, nullsFirst: false })
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true });
  throwIfError(error);
  const tasks = data ?? [];
  const isMine = (task: (typeof tasks)[number]) =>
    task.task_assignees.some((assignee) => assignee.user_id === userId);
  const active = (task: (typeof tasks)[number]) => task.status !== 'done';
  return {
    // Done tasks stay in the user's own list (last), so they can see what they finished.
    mine: tasks.filter(isMine).sort((a, b) => Number(!active(a)) - Number(!active(b))),
    open: tasks.filter((task) => !isMine(task) && task.is_open && active(task)),
    others: tasks.filter((task) => !isMine(task) && !task.is_open && active(task)),
  };
}

/** The user's active tasks, for the dashboard. */
export async function listMyActiveTasks(userId: string, limit = 5) {
  const { mine } = await listTasks(userId);
  return mine.filter((task) => task.status !== 'done').slice(0, limit);
}

export const getTask = cache(async (taskId: string) => {
  const supabase = await sessionClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('tasks')
    .select(
      `${taskColumns}, description_md,
       task_comments(id, body_md, created_at, updated_at, author_id, author:accounts(display_name))` as const,
    )
    .eq('id', taskId)
    .order('created_at', { referencedTable: 'task_comments', ascending: true })
    .maybeSingle();
  throwIfError(error);
  return data;
});
