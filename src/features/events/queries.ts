import 'server-only';
import { startOfTodayInTunis, tunisDayStart } from '@/lib/content/format';
import { toPrefixTsQuery } from '@/lib/content/search';
import { contentTags, publicRead } from '@/lib/supabase/public';

// Public event reads (anon + RLS ⇒ published events only; proposals and drafts never appear).

export const EVENTS_PAGE_SIZE = 24;

function throwIf(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

const listColumns =
  `id, slug, title, starts_at, ends_at, venue_text, governorate_code, is_free, cover_path,
  venue:public_profiles!events_venue_profile_id_fkey(slug, display_name)` as const;

export type EventFilters = {
  when?: 'upcoming' | 'past';
  governorate?: string;
  /** YYYY-MM-DD, inclusive, in Tunis time. */
  from?: string;
  to?: string;
  q?: string;
  page?: number;
  limit?: number;
};

const isDay = (value?: string) => (value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined);

export async function listEvents(filters: EventFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const when = filters.when ?? 'upcoming';
  const limit = filters.limit ?? EVENTS_PAGE_SIZE;
  return publicRead(
    [contentTags.events, contentTags.profiles],
    { items: [], total: 0 },
    async (db) => {
      const today = startOfTodayInTunis();
      let query = db
        .from('events')
        .select(listColumns, { count: 'exact' })
        .order('starts_at', { ascending: when === 'upcoming' })
        .range((page - 1) * limit, page * limit - 1);
      query = when === 'upcoming' ? query.gte('starts_at', today) : query.lt('starts_at', today);
      const from = isDay(filters.from);
      const to = isDay(filters.to);
      if (from) query = query.gte('starts_at', tunisDayStart(from));
      if (to) {
        const next = new Date(tunisDayStart(to));
        next.setUTCDate(next.getUTCDate() + 1);
        query = query.lt('starts_at', next.toISOString());
      }
      if (filters.governorate) query = query.eq('governorate_code', filters.governorate);
      const tsquery = toPrefixTsQuery(filters.q);
      if (tsquery) query = query.textSearch('search', tsquery, { config: 'simple' });
      const { data, count, error } = await query;
      throwIf(error);
      return { items: data ?? [], total: count ?? 0 };
    },
  );
}
/** Site search: published events (past and upcoming) whose title or venue match `q`, newest first. */
export async function searchEvents(q: string, limit = 24) {
  const tsquery = toPrefixTsQuery(q);
  if (!tsquery) return [];
  return publicRead([contentTags.events, contentTags.profiles], [], async (db) => {
    const { data, error } = await db
      .from('events')
      .select(listColumns)
      .textSearch('search', tsquery, { config: 'simple' })
      .order('starts_at', { ascending: false })
      .limit(limit);
    throwIf(error);
    return data ?? [];
  });
}

export type EventCard = Awaited<ReturnType<typeof listEvents>>['items'][number];

export async function getEvent(slug: string) {
  return publicRead(
    [contentTags.events, contentTags.profiles, contentTags.taxonomies],
    null,
    async (db) => {
      const { data, error } = await db
        .from('events')
        .select(
          `id, slug, title, description, starts_at, ends_at, venue_text, ticket_url, is_free, organized_by_acf,
         cover_path, published_at, updated_at,
         governorates(code, name),
         venue:public_profiles!events_venue_profile_id_fkey(slug, display_name, city, venue_details(address)),
         event_lineup(position, role, public_profiles(slug, type, display_name))`,
        )
        .eq('slug', slug)
        .maybeSingle();
      throwIf(error);
      if (!data) return null;
      // A line-up entry whose profile isn't public (RLS returned null) is simply left out.
      const lineup = [...data.event_lineup]
        .filter((entry) => entry.public_profiles)
        .sort((a, b) => a.position - b.position);
      return { ...data, event_lineup: lineup };
    },
  );
}
export type EventDetail = NonNullable<Awaited<ReturnType<typeof getEvent>>>;

export async function listEventSlugs() {
  return publicRead([contentTags.events], [], async (db) => {
    const { data, error } = await db.from('events').select('slug, updated_at').limit(5000);
    throwIf(error);
    return data ?? [];
  });
}
