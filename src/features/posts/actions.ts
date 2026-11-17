'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { uuid } from '@/features/profiles/schemas';
import { redirect } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { requireUser } from '@/lib/auth/guards';
import { randomSuffix, slugOrFallback } from '@/lib/content/slug';
import {
  fail,
  formDataToRecord,
  fromDbError,
  invalid,
  ok,
  type FormState,
} from '@/lib/forms/state';
import { contentTags } from '@/lib/supabase/public';
import { createClient } from '@/lib/supabase/server';
import {
  createBlogPostSchema,
  isOwnPostMediaPath,
  postIdSchema,
  postStatusSchema,
  updateBlogPostSchema,
} from './schemas';

// Blog editor actions. RLS lets only managers of an *approved* blog insert, edit, publish or delete
// its posts (private.can_write_blog); set_post_status() records publish/unpublish in review_events
// and the status trigger writes audit_log. Author and kind come from the database, not the form.

const localeSchema = z.enum(routing.locales).catch(routing.defaultLocale);

function refresh() {
  revalidateTag(contentTags.posts, { expire: 0 });
  revalidatePath('/[locale]/account', 'layout');
}

export async function createBlogPost(_state: FormState, formData: FormData): Promise<FormState> {
  const record = formDataToRecord(formData);
  const parsed = createBlogPostSchema.safeParse(record);
  if (!parsed.success) return invalid(parsed.error);
  await requireUser();
  const { profileId, postLocale, title, translationOf } = parsed.data;
  const supabase = await createClient();

  let translationGroup: string | undefined;
  let baseSlug = slugOrFallback(title, 'post', randomSuffix).slice(0, 110);
  if (translationOf) {
    const { data: original } = await supabase
      .from('posts')
      .select('translation_group, slug, blog_profile_id')
      .eq('id', translationOf)
      .maybeSingle();
    if (!original || original.blog_profile_id !== profileId) return fail('notFound');
    translationGroup = original.translation_group;
    // Same slug as the original reads well (/fr/…/x, /ar/…/x); it's unique per locale.
    baseSlug = original.slug;
  }

  const insert = (slug: string) =>
    supabase
      .from('posts')
      .insert({
        kind: 'blog',
        blog_profile_id: profileId,
        locale: postLocale,
        title,
        slug,
        ...(translationGroup ? { translation_group: translationGroup } : {}),
      })
      .select('id')
      .single();
  let result = await insert(baseSlug);
  if (result.error?.code === '23505') {
    // Either the slug is taken in this locale, or the group already has this language.
    if (translationGroup) {
      const { data: existing } = await supabase
        .from('posts')
        .select('id')
        .eq('translation_group', translationGroup)
        .eq('locale', postLocale)
        .maybeSingle();
      if (existing) return fail('conflict');
    }
    result = await insert(`${baseSlug.slice(0, 110)}-${randomSuffix()}`);
  }
  if (result.error || !result.data) return fromDbError(result.error);
  revalidatePath('/[locale]/account', 'layout');
  redirect({
    href: `/account/profiles/${profileId}/posts/${result.data.id}`,
    locale: localeSchema.parse(record.locale),
  });
  return ok('created');
}

export async function updateBlogPost(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = updateBlogPostSchema.safeParse(formDataToRecord(formData));
  if (!parsed.success) return invalid(parsed.error);
  await requireUser();
  const { postId, title, slug, excerpt, body } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('posts')
    .update({ title, slug, excerpt, body_md: body })
    .eq('id', postId)
    .eq('kind', 'blog')
    .select('id');
  if (error) {
    if (error.code === '23505')
      return { ok: false, error: 'slugTaken', fields: { slug: 'invalidSlug' } };
    return fromDbError(error);
  }
  if (!data?.length) return fail('forbidden');
  refresh();
  return ok('saved');
}

export async function setBlogPostStatus(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = postStatusSchema.safeParse(formDataToRecord(formData));
  if (!parsed.success) return invalid(parsed.error);
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc('set_post_status', {
    post: parsed.data.postId,
    new_status: parsed.data.status,
  });
  if (error) return fromDbError(error);
  refresh();
  return ok(parsed.data.status === 'published' ? 'published' : 'unpublished');
}

export async function deleteBlogPost(_state: FormState, formData: FormData): Promise<FormState> {
  const record = formDataToRecord(formData);
  const parsed = postIdSchema.safeParse(record);
  if (!parsed.success) return invalid(parsed.error);
  await requireUser();
  const supabase = await createClient();
  // Images first: the storage policy for posts/{id}/ looks the post up, so once the row is gone
  // its manager can't remove them. The removal only succeeds where the caller may write anyway.
  const folder = `posts/${parsed.data.postId}`;
  const { data: files } = await supabase.storage.from('public-media').list(folder);
  if (files?.length) {
    await supabase.storage.from('public-media').remove(files.map((f) => `${folder}/${f.name}`));
  }
  const { data, error } = await supabase
    .from('posts')
    .delete()
    .eq('id', parsed.data.postId)
    .eq('kind', 'blog')
    .eq('blog_profile_id', parsed.data.profileId)
    .select('id');
  if (error) return fromDbError(error);
  if (!data?.length) return fail('forbidden');
  refresh();
  redirect({
    href: `/account/profiles/${parsed.data.profileId}/posts`,
    locale: localeSchema.parse(record.locale),
  });
  return ok('deleted');
}

/** Records a post's cover image uploaded by the browser into posts/{postId}/. */
export async function setPostCover(postId: string, path: string): Promise<FormState> {
  const parsed = z.object({ postId: uuid, path: z.string().max(300) }).safeParse({ postId, path });
  if (!parsed.success) return invalid(parsed.error);
  if (parsed.data.path && !isOwnPostMediaPath(parsed.data.postId, parsed.data.path))
    return fail('forbidden');
  await requireUser();
  const supabase = await createClient();
  const { data: before } = await supabase
    .from('posts')
    .select('cover_path')
    .eq('id', postId)
    .maybeSingle();
  const { data, error } = await supabase
    .from('posts')
    .update({ cover_path: parsed.data.path || null })
    .eq('id', postId)
    .eq('kind', 'blog')
    .select('id');
  if (error) return fromDbError(error);
  if (!data?.length) return fail('forbidden');
  const previous = before?.cover_path;
  if (previous && previous !== parsed.data.path && isOwnPostMediaPath(postId, previous)) {
    await supabase.storage.from('public-media').remove([previous]);
  }
  refresh();
  return ok(parsed.data.path ? 'saved' : 'removed');
}
