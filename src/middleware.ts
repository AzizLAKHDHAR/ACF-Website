import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// Locale negotiation (cookie → Accept-Language → default) and the `/` → `/{locale}` redirect.
// Supabase session refresh joins this file in phase 2.
//
// Why `middleware.ts` and not Next 16's `proxy.ts`: `proxy` always runs on the Node.js runtime,
// which OpenNext only supports experimentally on Cloudflare Workers, and it nearly doubles the
// Worker bundle (2.7 MiB vs 1.5 MiB gzipped; the free plan allows 3 MiB). The Edge-runtime
// `middleware` convention is deprecated but supported. Revisit when OpenNext supports Node
// middleware or Next drops `middleware` (D-031).
export default createMiddleware(routing);

export const config = {
  // Everything except API routes, Next.js internals and files with an extension.
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
};
