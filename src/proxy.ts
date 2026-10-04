import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// Locale negotiation (cookie → Accept-Language → default) and the `/` → `/{locale}` redirect.
// Supabase session refresh joins this proxy in phase 2. Runs on the Node.js runtime (Vercel, D-042).
export const proxy = createMiddleware(routing);

export const config = {
  // Everything except API routes, Next.js internals and files with an extension.
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
};
