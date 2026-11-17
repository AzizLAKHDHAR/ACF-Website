import type { TaskStatus } from './schemas';

/** Overdue: past its due day (Tunis calendar, YYYY-MM-DD) and neither done nor cancelled. */
export function isOverdue(
  task: { due_on: string | null; status: TaskStatus },
  today: string,
): boolean {
  return (
    task.due_on !== null &&
    task.due_on < today &&
    task.status !== 'done' &&
    task.status !== 'cancelled'
  );
}
