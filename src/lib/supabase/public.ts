import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { supabaseConfig } from '@/lib/env';
import type { Database } from '@/types/database';

/**
 * Cookie-less client for public, cacheable reads (static and ISR pages). It is always anonymous,
 * so it sees exactly what RLS shows to the `anon` role, and reading it never opts a page into
 * dynamic rendering.
 */
export function createPublicClient() {
  const { url, publishableKey } = supabaseConfig();
  return createSupabaseClient<Database>(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
