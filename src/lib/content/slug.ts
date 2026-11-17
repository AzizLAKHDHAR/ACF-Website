// URL slugs for profiles and posts: lowercase Latin letters, digits and single dashes (the same
// rule as the CHECK constraints in the catalogue and content migrations).

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** A slug from a display name: accents folded, everything else collapsed into dashes. */
export function slugify(value: string, maxLength = 80): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/œ/gi, 'oe')
    .replace(/æ/gi, 'ae')
    .replace(/ß/g, 'ss')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');
}

/**
 * A slug for a new record. Names written only in Arabic (or another non-Latin script) fold to
 * nothing, so they get `{prefix}-{random}`, which the owner can change later.
 */
export function slugOrFallback(value: string, prefix: string, random: () => string): string {
  const slug = slugify(value);
  return slug.length >= 2 ? slug : `${prefix}-${random()}`;
}

export function randomSuffix(): string {
  return crypto.randomUUID().replaceAll('-', '').slice(0, 6);
}
