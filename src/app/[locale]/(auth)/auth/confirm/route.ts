import type { EmailOtpType } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { NEXT_COOKIE } from '@/features/auth/constants';
import { safeNextPath } from '@/features/auth/schemas';
import { getPathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';

const querySchema = z.object({
  token_hash: z.string().min(1).max(1024),
  type: z.enum(['email', 'signup', 'magiclink', 'recovery', 'invite', 'email_change']),
});

/**
 * Target of every auth email (supabase/templates/*.html). Verifies the one-time token server-side,
 * which sets the session cookies, then sends the user on: recovery → new password form, otherwise
 * the page they were going to (magic link) or their account.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteContext<'/[locale]/auth/confirm'>,
) {
  const { locale: rawLocale } = await params;
  const locale =
    routing.locales.find((candidate) => candidate === rawLocale) ?? routing.defaultLocale;
  const to = (pathname: string, query?: Record<string, string>) =>
    NextResponse.redirect(new URL(getPathname({ href: { pathname, query }, locale }), request.url));

  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return to('/login', { error: 'link' });

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: parsed.data.token_hash,
    type: parsed.data.type as EmailOtpType,
  });
  if (error) return to('/login', { error: 'link' });

  if (parsed.data.type === 'recovery') return to('/reset-password');
  const cookieStore = await cookies();
  const next = safeNextPath(cookieStore.get(NEXT_COOKIE)?.value);
  cookieStore.delete(NEXT_COOKIE);
  return to(next);
}
