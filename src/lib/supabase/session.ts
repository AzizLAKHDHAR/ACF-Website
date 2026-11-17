import 'server-only';
import { isShellPreview } from '@/lib/auth/preview';
import { createClient } from './server';

/**
 * The signed-in user's client for reads in the hidden areas, or null in the database-less shell
 * preview, where pages render their empty states. RLS filters every query.
 */
export async function sessionClient() {
  return isShellPreview() ? null : createClient();
}

/** Reads fail loudly: a refused or broken query is a bug, not an empty list. */
export function throwIfError(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}
