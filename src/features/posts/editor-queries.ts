import 'server-only';
import { createClient } from '@/lib/supabase/server';

// Reads for the blog editor, with the signed-in user's client: managers see their blog's drafts
// and unpublished posts too (posts RLS); public pages keep using ./queries (anon, cached).

function throwIf(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

/** Every post of a blog in any status, newest first. */
export async function listEditorPosts(blogProfileId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('posts')
    .select('id, locale, slug, title, status, translation_group, published_at, updated_at')
    .eq('kind', 'blog')
    .eq('blog_profile_id', blogProfileId)
    .order('updated_at', { ascending: false });
  throwIf(error);
  return data ?? [];
}

/** One post for editing, with the other language versions in its translation group. */
export async function getEditorPost(postId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('posts')
    .select(
      'id, kind, blog_profile_id, locale, slug, title, excerpt, body_md, cover_path, status, translation_group, published_at',
    )
    .eq('id', postId)
    .maybeSingle();
  throwIf(error);
  if (!data || data.kind !== 'blog' || !data.blog_profile_id) return null;
  const { data: siblings, error: siblingsError } = await supabase
    .from('posts')
    .select('id, locale, title, status')
    .eq('translation_group', data.translation_group)
    .neq('id', data.id);
  throwIf(siblingsError);
  return { ...data, blog_profile_id: data.blog_profile_id, translations: siblings ?? [] };
}
