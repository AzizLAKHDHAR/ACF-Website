import { createServerClient } from '@supabase/ssr';
import type { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured, supabaseConfig } from '@/lib/env';

/**
 * Refreshes the Supabase session on the way through the proxy and writes rotated auth cookies onto
 * `response` (the next-intl response, so locale redirects and rewrites are kept). Requests without
 * an auth cookie skip it entirely: anonymous traffic to static pages pays nothing.
 */
export async function updateSession(
  request: NextRequest,
  response: NextResponse,
): Promise<NextResponse> {
  if (
    !isSupabaseConfigured() ||
    !request.cookies.getAll().some(({ name }) => name.startsWith('sb-'))
  ) {
    return response;
  }
  const { url, publishableKey } = supabaseConfig();
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        }
        // Responses that set auth cookies must never be cached by a CDN.
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      },
    },
  });
  // Verifies the JWT and refreshes it when it has expired. Don't add code between client creation
  // and this call (@supabase/ssr guidance).
  await supabase.auth.getClaims();
  return response;
}
