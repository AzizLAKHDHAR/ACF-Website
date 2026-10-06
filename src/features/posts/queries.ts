import 'server-only';
import type { Locale } from '@/i18n/routing';
import { contentTags, publicRead } from '@/lib/supabase/public';

// Public post reads (anon + RLS ⇒ published posts only). News is one row per locale, linked by
// `translation_group`; blog posts belong to an approved blog profile.

export const POSTS_PAGE_SIZE = 12;

function throwIf(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

const cardColumns =
  'id, kind, locale, slug, title, excerpt, cover_path, published_at, translation_group' as const;

export async function listNews(locale: Locale, { page = 1, limit = POSTS_PAGE_SIZE } = {}) {
  return publicRead([contentTags.posts], { items: [], total: 0 }, async (db) => {
    const { data, count, error } = await db
      .from('posts')
      .select(cardColumns, { count: 'exact' })
      .eq('kind', 'news')
      .eq('locale', locale)
      .order('published_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);
    throwIf(error);
    return { items: data ?? [], total: count ?? 0 };
  });
}
export type PostCard = Awaited<ReturnType<typeof listNews>>['items'][number];

/** A news article in `locale`, plus the slugs of its published translations (for hreflang). */
export async function getNews(locale: Locale, slug: string) {
  return publicRead([contentTags.posts], null, async (db) => {
    const { data, error } = await db
      .from('posts')
      .select(
        'id, locale, slug, title, excerpt, body_md, cover_path, published_at, updated_at, translation_group',
      )
      .eq('kind', 'news')
      .eq('locale', locale)
      .eq('slug', slug)
      .maybeSingle();
    throwIf(error);
    if (!data) return null;
    const { data: translations, error: translationsError } = await db
      .from('posts')
      .select('locale, slug')
      .eq('kind', 'news')
      .eq('translation_group', data.translation_group);
    throwIf(translationsError);
    return { ...data, translations: translations ?? [] };
  });
}
export type NewsDetail = NonNullable<Awaited<ReturnType<typeof getNews>>>;

/** Published posts of a blog, newest first (every language; each post is in its own locale). */
export async function listBlogPosts(blogProfileId: string, { limit = 50 } = {}) {
  return publicRead([contentTags.posts], [], async (db) => {
    const { data, error } = await db
      .from('posts')
      .select(cardColumns)
      .eq('kind', 'blog')
      .eq('blog_profile_id', blogProfileId)
      .order('published_at', { ascending: false })
      .limit(limit);
    throwIf(error);
    return data ?? [];
  });
}

/** The latest posts across all blogs, for the blogs index. */
export async function listLatestBlogPosts(limit = 6) {
  return publicRead([contentTags.posts, contentTags.profiles], [], async (db) => {
    const { data, error } = await db
      .from('posts')
      .select(`${cardColumns}, blog:public_profiles!posts_blog_profile_id_fkey(slug, display_name)`)
      .eq('kind', 'blog')
      .order('published_at', { ascending: false })
      .limit(limit);
    throwIf(error);
    // A post whose blog isn't public anymore (suspended) is hidden with it.
    return (data ?? []).filter((post) => post.blog);
  });
}

export async function getBlogPost(blogProfileId: string, slug: string, locale: Locale) {
  return publicRead([contentTags.posts], null, async (db) => {
    const { data, error } = await db
      .from('posts')
      .select('id, locale, slug, title, excerpt, body_md, cover_path, published_at, updated_at')
      .eq('kind', 'blog')
      .eq('blog_profile_id', blogProfileId)
      .eq('slug', slug);
    throwIf(error);
    const rows = data ?? [];
    return rows.find((row) => row.locale === locale) ?? rows[0] ?? null;
  });
}

/** Every published post, for the sitemap. */
export async function listPostSlugs() {
  return publicRead([contentTags.posts, contentTags.profiles], [], async (db) => {
    const { data, error } = await db
      .from('posts')
      .select(
        'kind, locale, slug, updated_at, translation_group, blog:public_profiles!posts_blog_profile_id_fkey(slug)',
      )
      .limit(5000);
    throwIf(error);
    return data ?? [];
  });
}
