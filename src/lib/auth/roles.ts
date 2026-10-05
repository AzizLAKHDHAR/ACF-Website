import type { Database } from '@/types/database';

export type AppRole = Database['public']['Enums']['app_role'];

// Mirrors private.role_rank() in the database (member < board < admin).
const rank: Record<AppRole, number> = { member: 1, board: 2, admin: 3 };

export function hasRoleAtLeast(role: AppRole | null | undefined, minimum: AppRole): boolean {
  return role != null && rank[role] >= rank[minimum];
}
