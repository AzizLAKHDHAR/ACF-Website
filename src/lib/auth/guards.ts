import 'server-only';
import { notFound } from 'next/navigation';

export type AppRole = 'member' | 'board' | 'admin';

/**
 * Development-only escape hatch so the hidden shells can be reviewed and screenshotted
 * (`ACF_PREVIEW_HIDDEN_AREAS=1 npm run dev`, used by `npm run screenshots`).
 * `process.env.NODE_ENV` is inlined at build time, so production bundles always deny.
 */
function isShellPreview(): boolean {
  return process.env.NODE_ENV === 'development' && process.env.ACF_PREVIEW_HIDDEN_AREAS === '1';
}

/**
 * PHASE 1 STUB. Authentication arrives in phase 2, so there is never a signed-in user yet and
 * every guarded area answers 404 (D-010). Phase 2 replaces the body with a Supabase session check
 * (getClaims) and keeps the signature. Call it in layouts AND in every Server Action / route handler.
 */
export async function requireUser(): Promise<void> {
  if (isShellPreview()) return;
  notFound();
}

/**
 * PHASE 1 STUB. Phase 2 reads the caller's role from `public.memberships` (via RLS) and compares
 * ranks member < board < admin. RLS remains the real enforcement (CLAUDE.md → Security rules).
 */
export async function requireRole(minimum: AppRole): Promise<void> {
  // Unused until phase 2; the parameter is already part of the contract.
  void minimum;
  if (isShellPreview()) return;
  notFound();
}
