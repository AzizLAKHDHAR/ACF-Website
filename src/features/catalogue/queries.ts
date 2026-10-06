import 'server-only';
import type { CatalogueSection } from '@/config/navigation';
import { toPrefixTsQuery } from '@/lib/content/search';
import { contentTags, publicRead } from '@/lib/supabase/public';
import type { Database } from '@/types/database';

// Public catalogue reads. They run as `anon` (createPublicClient), so RLS only ever returns
// approved profiles: drafts, pending, rejected and suspended profiles can't leak through a query.

export type ProfileType = Database['public']['Enums']['profile_type'];

export const profileTypeBySection = {
  artists: 'artist',
  professionals: 'professional',
  venues: 'venue',
  studios: 'studio',
  blogs: 'blog',
} as const satisfies Record<CatalogueSection | 'blogs', ProfileType>;

export const sectionByProfileType: Record<ProfileType, CatalogueSection | 'blogs'> = {
  artist: 'artists',
  professional: 'professionals',
  venue: 'venues',
  studio: 'studios',
  blog: 'blogs',
};

export const PAGE_SIZE = 24;

const cardColumns =
  'id, type, slug, display_name, tagline, city, governorate_code, avatar_path, profile_genres(genres(slug, name))' as const;

function throwIf(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export type ProfileFilters = {
  genre?: string;
  governorate?: string;
  q?: string;
  page?: number;
};

export async function listProfiles(type: ProfileType, filters: ProfileFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  return publicRead(
    [contentTags.profiles, contentTags.taxonomies],
    { items: [], total: 0 },
    async (db) => {
      let ids: string[] | null = null;
      if (filters.genre) {
        const { data, error } = await db
          .from('profile_genres')
          .select('profile_id, genres!inner(slug)')
          .eq('genres.slug', filters.genre);
        throwIf(error);
        ids = (data ?? []).map((row) => row.profile_id);
        if (ids.length === 0) return { items: [], total: 0 };
      }
      let query = db
        .from('public_profiles')
        .select(cardColumns, { count: 'exact' })
        .eq('type', type)
        .order('display_name')
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      if (ids) query = query.in('id', ids);
      if (filters.governorate) query = query.eq('governorate_code', filters.governorate);
      const tsquery = toPrefixTsQuery(filters.q);
      if (tsquery) query = query.textSearch('search', tsquery, { config: 'simple' });
      const { data, count, error } = await query;
      throwIf(error);
      return { items: data ?? [], total: count ?? 0 };
    },
  );
}
/** Site search: approved profiles of every type whose name, city or tagline match `q`. */
export async function searchProfiles(q: string, limit = 24) {
  const tsquery = toPrefixTsQuery(q);
  if (!tsquery) return [];
  return publicRead([contentTags.profiles, contentTags.taxonomies], [], async (db) => {
    const { data, error } = await db
      .from('public_profiles')
      .select(cardColumns)
      .textSearch('search', tsquery, { config: 'simple' })
      .order('display_name')
      .limit(limit);
    throwIf(error);
    return data ?? [];
  });
}

export type ProfileCard = Awaited<ReturnType<typeof listProfiles>>['items'][number];

export async function getProfile(type: ProfileType, slug: string) {
  return publicRead([contentTags.profiles, contentTags.taxonomies], null, async (db) => {
    const { data, error } = await db
      .from('public_profiles')
      .select(
        `id, type, slug, display_name, tagline, bio, city, governorate_code, avatar_path, cover_path, links,
         public_contact, approved_at, updated_at,
         governorates(code, name),
         profile_genres(genres(slug, name)),
         profile_professions(professions(slug, name)),
         artist_details(kind, formed_year),
         professional_details(years_experience, available_for_hire),
         venue_details(address, lat, lng, capacity, venue_kind, has_backline),
         studio_details(address, services)`,
      )
      .eq('type', type)
      .eq('slug', slug)
      .maybeSingle();
    throwIf(error);
    return data;
  });
}
export type ProfileDetail = NonNullable<Awaited<ReturnType<typeof getProfile>>>;

/** Published events a profile plays at (artists) or hosts (venues). */
export async function listProfileEvents(profile: { id: string; type: ProfileType }) {
  return publicRead([contentTags.events, contentTags.profiles], [], async (db) => {
    const columns =
      'id, slug, title, starts_at, ends_at, venue_text, governorate_code, is_free' as const;
    if (profile.type === 'venue') {
      const { data, error } = await db
        .from('events')
        .select(columns)
        .eq('venue_profile_id', profile.id)
        .order('starts_at', { ascending: false })
        .limit(20);
      throwIf(error);
      return data ?? [];
    }
    if (profile.type === 'artist') {
      const { data, error } = await db
        .from('event_lineup')
        .select(`events!inner(${columns})`)
        .eq('profile_id', profile.id)
        .limit(20);
      throwIf(error);
      return (data ?? [])
        .map((row) => row.events)
        .sort((a, b) => b.starts_at.localeCompare(a.starts_at));
    }
    return [];
  });
}

export async function listGenres() {
  return publicRead([contentTags.taxonomies], [], async (db) => {
    const { data, error } = await db.from('genres').select('slug, name').order('position');
    throwIf(error);
    return data ?? [];
  });
}

export async function listGovernorates() {
  return publicRead([contentTags.taxonomies], [], async (db) => {
    const { data, error } = await db.from('governorates').select('code, name').order('position');
    throwIf(error);
    return data ?? [];
  });
}

/** Every approved profile, for the sitemap. */
export async function listProfileSlugs() {
  return publicRead([contentTags.profiles], [], async (db) => {
    const { data, error } = await db
      .from('public_profiles')
      .select('type, slug, updated_at')
      .limit(5000);
    throwIf(error);
    return data ?? [];
  });
}
