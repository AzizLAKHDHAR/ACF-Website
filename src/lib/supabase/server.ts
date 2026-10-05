import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseConfig } from '@/lib/env';
import type { Database } from '@/types/database';

/**
 * Supabase client for Server Components, Server Actions and route handlers. It acts as the
 * signed-in user (cookies), so every query is filtered by RLS. Create one per request.
 */
export async function createClient() {
  const { url, publishableKey } = supabaseConfig();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components can't write cookies; the proxy refreshes the session instead.
        }
      },
    },
  });
}
