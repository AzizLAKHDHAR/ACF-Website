import { z } from 'zod';
import { id, requiredText } from '@/lib/forms/schemas';
import type { Database } from '@/types/database';

// Tasks for members (roles.md §3): status changes on assigned tasks, self-assignment of open tasks,
// comments. Creating and assigning tasks is the board's, in phase 6.

export type TaskStatus = Database['public']['Enums']['task_status'];
export const taskStatuses = [
  'todo',
  'in_progress',
  'blocked',
  'done',
  'cancelled',
] as const satisfies readonly TaskStatus[];
/** What an assignee may set; cancelling is left to the board. */
export const assigneeStatuses = ['todo', 'in_progress', 'blocked', 'done'] as const;

export const taskIdSchema = z.object({ taskId: id });

export const taskStatusSchema = z.object({
  taskId: id,
  status: z.enum(assigneeStatuses, 'required'),
});

export const commentSchema = z.object({ taskId: id, body: requiredText(5000) });

export const commentIdSchema = z.object({ taskId: id, commentId: id });
