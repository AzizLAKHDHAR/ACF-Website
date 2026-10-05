import 'server-only';
import { notFound } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { cache } from 'react';
import { redirect } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { isSupabaseConfigured } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { hasRoleAtLeast, type AppRole } from './roles';

export type { AppRole } from './roles';

export type SessionUser = { id: string; email: string | null };

/**
 * Development-only escape hatch so the hidden shells can be reviewed and screenshotted without a
 * database (`ACF_PREVIEW_HIDDEN_AREAS=1 npm run dev`, used by `npm run screenshots`).
 * `process.env.NODE_ENV` is inlined at build time, so production bundles never take this path.
 */
function isShellPreview(): boolean {
  return process.env.NODE_ENV === 'development' && process.env.ACF_PREVIEW_HIDDEN_AREAS === '1';
}

/**
 * The signed-in user, from a verified JWT (`getClaims()`; never `getSession()` or a cookie parsed
 * by hand — CLAUDE.md → Security rule 3). Memoized per request.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims.sub) return null;
  return {
    id: data.claims.sub,
    email: typeof data.claims.email === 'string' ? data.claims.email : null,
  };
});

/**
 * The caller's effective association role: an active membership on an account that is not
 * deactivated (Guard rail 6). Read through RLS (own rows); `private.has_role()` is what the
 * database enforces, this only decides what to render.
 */
export const getSessionRole = cache(async (): Promise<AppRole | null> => {
  const user = await getSessionUser();
  if (!user) return null;
  const supabase = await createClient();
  const [{ data: membership }, { data: account }] = await Promise.all([
    supabase.from('memberships').select('role, status').eq('user_id', user.id).maybeSingle(),
    supabase.from('accounts').select('deactivated_at').eq('id', user.id).maybeSingle(),
  ]);
  if (!membership || membership.status !== 'active' || !account || account.deactivated_at)
    return null;
  return membership.role;
});

type GuardOptions = {
  /** Locale-less path to come back to after signing in (e.g. `/member`). */
  returnTo?: string;
};

async function redirectToLogin(returnTo?: string): Promise<never> {
  const locale = (await getLocale()) as Locale;
  return redirect({
    href: { pathname: '/login', query: returnTo ? { next: returnTo } : {} },
    locale,
  });
}

/**
 * Signed-in users only; others are sent to the sign-in page. Call it in layouts AND at the top of
 * every Server Action / route handler (actions are public endpoints). RLS remains the real control.
 */
export async function requireUser(options: GuardOptions = {}): Promise<SessionUser> {
  if (isShellPreview()) return { id: 'preview', email: null };
  const user = await getSessionUser();
  if (!user) return redirectToLogin(options.returnTo);
  return user;
}

/**
 * Association role `minimum` or higher (member < board < admin). Anonymous visitors are sent to
 * sign in; signed-in users without the role get a 404, so hidden areas don't reveal that they
 * exist (D-010).
 */
export async function requireRole(
  minimum: AppRole,
  options: GuardOptions = {},
): Promise<SessionUser> {
  if (isShellPreview()) return { id: 'preview', email: null };
  const user = await requireUser(options);
  const role = await getSessionRole();
  if (!hasRoleAtLeast(role, minimum)) notFound();
  return user;
}
