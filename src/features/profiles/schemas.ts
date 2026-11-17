import { z } from 'zod';
import { routing, type Locale } from '@/i18n/routing';
import { SLUG_PATTERN } from '@/lib/content/slug';
import type { Database, Json } from '@/types/database';

// Validation for the profile onboarding forms (roadmap phase 4). Messages are keys under
// `forms.fieldErrors`. The database re-checks everything (constraints, RLS, RPCs).

export type ProfileType = Database['public']['Enums']['profile_type'];
export type ProfileStatus = Database['public']['Enums']['profile_status'];

export const profileTypes = [
  'artist',
  'professional',
  'venue',
  'studio',
  'blog',
] as const satisfies readonly ProfileType[];
export const artistKinds = ['solo', 'band', 'collective', 'dj'] as const;
export const studioServices = [
  'recording',
  'mixing',
  'mastering',
  'rehearsal',
  'production',
] as const;
export const managerRoles = ['owner', 'editor'] as const;
export const mediaKinds = ['avatar', 'cover'] as const;
export type MediaKind = (typeof mediaKinds)[number];

export const MAX_LINKS = 6;
export const TAGLINE_MAX = 160;
export const BIO_MAX = 4000;

// z.guid(): any 8-4-4-4-12 id. z.uuid() also checks RFC variant bits, which the seed's readable
// fixed ids (…-4000-d000-…) don't follow.
export const uuid = z.guid('required');
const trimmed = (max: number) => z.string().trim().max(max, 'tooLong');
const optionalText = (max: number) =>
  trimmed(max)
    .optional()
    .transform((value) => (value ? value : null));
const checkbox = z.preprocess((value) => value === 'on' || value === 'true', z.boolean());
const list = <T extends z.ZodType>(item: T) =>
  z.preprocess(
    (value) => (value === undefined || value === '' ? [] : Array.isArray(value) ? value : [value]),
    z.array(item),
  );
const optionalInt = (min: number, max: number) =>
  z.preprocess(
    (value) => (value === '' || value === undefined ? null : Number(value)),
    z
      .number('invalidNumber')
      .int('invalidNumber')
      .min(min, 'invalidNumber')
      .max(max, 'invalidNumber')
      .nullable(),
  );

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'required')
  .max(80, 'tooLong')
  .regex(SLUG_PATTERN, 'invalidSlug');

export const httpUrl = z
  .string()
  .trim()
  .max(300, 'tooLong')
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' || url.protocol === 'http:';
    } catch {
      return false;
    }
  }, 'invalidUrl');

/** `{prefix}_ar`, `{prefix}_fr`, `{prefix}_en` form fields → a jsonb locale map without empty values. */
export function localeMapFrom(
  record: Record<string, unknown>,
  prefix: string,
): Partial<Record<Locale, string>> {
  const map: Partial<Record<Locale, string>> = {};
  for (const locale of routing.locales) {
    const value = record[`${prefix}_${locale}`];
    if (typeof value === 'string' && value.trim() !== '') map[locale] = value.trim();
  }
  return map;
}

export const createProfileSchema = z.object({
  type: z.enum(profileTypes, 'required'),
  displayName: z.string().trim().min(1, 'required').max(120, 'tooLong'),
});

export const profileGeneralSchema = z.object({
  profileId: uuid,
  displayName: z.string().trim().min(1, 'required').max(120, 'tooLong'),
  slug: slugSchema,
  tagline_ar: trimmed(TAGLINE_MAX).optional(),
  tagline_fr: trimmed(TAGLINE_MAX).optional(),
  tagline_en: trimmed(TAGLINE_MAX).optional(),
  bio_ar: trimmed(BIO_MAX).optional(),
  bio_fr: trimmed(BIO_MAX).optional(),
  bio_en: trimmed(BIO_MAX).optional(),
  governorate: z
    .string()
    .optional()
    .transform((value) => (value ? value : null))
    .refine((value) => value === null || /^TN-[0-9]{2}$/.test(value), 'required'),
  city: optionalText(80),
  links: list(z.string()).transform((values) => values.map((v) => v.trim()).filter(Boolean)),
});

/** Validated link URLs: at most MAX_LINKS, each http(s). */
export const linksSchema = z.array(httpUrl).max(MAX_LINKS, 'tooLong');

export const artistDetailsSchema = z.object({
  kind: z.enum(artistKinds, 'required'),
  formedYear: optionalInt(1900, 2100),
  genres: list(uuid).pipe(z.array(uuid).max(12, 'tooLong')),
});
export const professionalDetailsSchema = z.object({
  yearsExperience: optionalInt(0, 80),
  availableForHire: checkbox,
  professions: list(uuid).pipe(z.array(uuid).max(12, 'tooLong')),
});
export const venueDetailsSchema = z.object({
  address: optionalText(200),
  capacity: optionalInt(1, 100_000),
  venueKind: optionalText(60),
  hasBackline: checkbox,
});
export const studioDetailsSchema = z.object({
  address: optionalText(200),
  services: list(z.enum(studioServices, 'required')),
});

export const profilePrivateSchema = z.object({
  profileId: uuid,
  contactEmail: z
    .string()
    .trim()
    .max(254, 'tooLong')
    .optional()
    .transform((value) => (value ? value : null))
    .pipe(z.email('invalidEmail').nullable()),
  contactPhone: optionalText(32),
});

export const profileIdSchema = z.object({ profileId: uuid });

export const addManagerSchema = z.object({
  profileId: uuid,
  email: z.string().trim().min(1, 'required').max(254, 'tooLong').pipe(z.email('invalidEmail')),
  role: z.enum(managerRoles, 'required'),
});

export const removeManagerSchema = z.object({ profileId: uuid, userId: uuid });

export const setMediaSchema = z.object({
  profileId: uuid,
  kind: z.enum(mediaKinds, 'required'),
  path: z.string().max(300, 'tooLong'),
});

/** Where a profile's media lives in `public-media` (matches private.can_write_public_media()). */
export function isOwnMediaPath(profileId: string, path: string): boolean {
  const prefix = `profiles/${profileId}/`;
  return path.startsWith(prefix) && /^[a-z0-9-]+\.(webp|jpe?g|png|gif|avif)$/.test(path.slice(prefix.length));
}

/** The kind of a profile link, from its host (used for the label on the public page). */
export function linkKind(url: string): string {
  let host = '';
  try {
    host = new URL(url).hostname.replace(/^www\.|^m\./, '');
  } catch {
    return 'website';
  }
  const known: Record<string, string> = {
    'youtube.com': 'youtube',
    'youtu.be': 'youtube',
    'open.spotify.com': 'spotify',
    'soundcloud.com': 'soundcloud',
    'instagram.com': 'instagram',
    'facebook.com': 'facebook',
    'tiktok.com': 'tiktok',
  };
  if (host.endsWith('.bandcamp.com') || host === 'bandcamp.com') return 'bandcamp';
  return known[host] ?? 'website';
}

/**
 * What a profile still needs before it can be submitted for review. ACF hasn't fixed the required
 * fields per type yet (roadmap phase 4 → inputs needed); until then: a short description in at least
 * one language and a governorate, so the catalogue filters and cards have something to show.
 */
export function missingForSubmit(profile: { tagline: Json; governorate_code: string | null }): string[] {
  const missing: string[] = [];
  const tagline = profile.tagline;
  const hasTagline =
    !!tagline &&
    typeof tagline === 'object' &&
    !Array.isArray(tagline) &&
    Object.values(tagline).some((value) => typeof value === 'string' && value.trim() !== '');
  if (!hasTagline) missing.push('tagline');
  if (!profile.governorate_code) missing.push('governorate');
  return missing;
}

/** Statuses in which the managers may submit the profile for review. */
export function canSubmit(status: ProfileStatus): boolean {
  return status === 'draft' || status === 'rejected';
}
