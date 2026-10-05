'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

/** Supabase client for Client Components (acts as the signed-in user; RLS applies). */
export function createClient() {
  // Read directly (inlined at build) so the zod env schema stays out of the client bundle.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) throw new Error('Supabase is not configured.');
  return createBrowserClient<Database>(url, publishableKey);
}
