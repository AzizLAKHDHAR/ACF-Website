import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabaseConfig } from '@/lib/env';
import type { Database } from '@/types/database';

/** Cache tags for public content; publishing code calls `revalidateTag(tag, …)` with these. */
export const contentTags = {
  profiles: 'profiles',
  events: 'events',
  posts: 'posts',
  taxonomies: 'taxonomies',
  settings: 'settings',
} as const;
export type ContentTag = (typeof contentTags)[keyof typeof contentTags];

/** Upper bound on staleness when nothing calls revalidateTag (e.g. a change made in the SQL editor). */
export const CONTENT_REVALIDATE_SECONDS = 300;

/**
 * Cookie-less client for public, cacheable reads. It is always anonymous, so it sees exactly what
 * RLS shows the `anon` role (approved profiles, published posts and events), and its requests go
 * through Next's data cache with the given tags, so pages stay static and are revalidated on demand.
 */
export function createPublicClient(tags: readonly ContentTag[] = []) {
  const { url, publishableKey } = supabaseConfig();
  return createSupabaseClient<Database>(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          cache: 'force-cache',
          next: { revalidate: CONTENT_REVALIDATE_SECONDS, tags: [...tags] },
        }),
    },
  });
}

/**
 * Runs a public read, or returns `fallback` when no database is configured (preview deployments,
 * D-059) or the query fails, so public pages degrade to empty states instead of erroring.
 */
export async function publicRead<T>(
  tags: readonly ContentTag[],
  fallback: T,
  query: (client: ReturnType<typeof createPublicClient>) => PromiseLike<T>,
): Promise<T> {
  if (!isSupabaseConfigured()) return fallback;
  try {
    return await query(createPublicClient(tags));
  } catch (error) {
    console.error('[public read]', error);
    return fallback;
  }
}
