import { z } from 'zod';
import { routing } from '@/i18n/routing';
import { slugSchema, uuid } from '@/features/profiles/schemas';

// Blog posts written by the managers of an approved blog (roles.md §1 → Blog posts). One row per
// locale; translations share a translation_group.

export const POST_BODY_MAX = 50_000;

export const createBlogPostSchema = z.object({
  profileId: uuid,
  postLocale: z.enum(routing.locales, 'required'),
  title: z.string().trim().min(1, 'required').max(200, 'tooLong'),
  /** When set, the new post is a translation of this one (same group). */
  translationOf: z
    .string()
    .optional()
    .transform((value) => (value ? value : null))
    .pipe(uuid.nullable()),
});

export const updateBlogPostSchema = z.object({
  postId: uuid,
  title: z.string().trim().min(1, 'required').max(200, 'tooLong'),
  slug: slugSchema.pipe(z.string().max(120, 'tooLong')),
  excerpt: z
    .string()
    .trim()
    .max(300, 'tooLong')
    .optional()
    .transform((value) => (value ? value : null)),
  body: z.string().max(POST_BODY_MAX, 'tooLong').default(''),
});

export const postStatusSchema = z.object({
  postId: uuid,
  status: z.enum(['published', 'unpublished', 'draft'], 'required'),
});

export const postIdSchema = z.object({ postId: uuid, profileId: uuid });

/** Where a post's images live in `public-media` (matches private.can_write_public_media()). */
export function isOwnPostMediaPath(postId: string, path: string): boolean {
  const prefix = `posts/${postId}/`;
  return (
    path.startsWith(prefix) &&
    /^[a-z0-9-]+\.(webp|jpe?g|png|gif|avif)$/.test(path.slice(prefix.length))
  );
}
