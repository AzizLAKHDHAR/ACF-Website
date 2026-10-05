import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from '@/lib/env';
import { serverEnv } from '@/lib/env.server';
import type { Database } from '@/types/database';

/**
 * Service-role client: BYPASSES RLS. Allowed only in src/app/api/cron/**, src/app/api/webhooks/**
 * and account deletion (docs/roles.md → System actor); ESLint blocks every other import.
 */
export function createAdminClient() {
  const { url } = supabaseConfig();
  const secretKey = serverEnv.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('SUPABASE_SECRET_KEY is not set.');
  }
  return createClient<Database>(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
