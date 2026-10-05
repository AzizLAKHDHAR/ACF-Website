import createMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { updateSession } from './lib/supabase/proxy';

const handleI18nRouting = createMiddleware(routing);

// Locale negotiation (cookie → Accept-Language → default) and the `/` → `/{locale}` redirect, then
// Supabase session refresh. Runs on the Node.js runtime (Vercel, D-042).
export async function proxy(request: NextRequest) {
  const response = handleI18nRouting(request);
  return updateSession(request, response);
}

export const config = { matcher: '/((?!api|_next|_vercel|.*\\..*).*)' };
