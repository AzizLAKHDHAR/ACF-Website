/**
 * Turns free text into a safe Postgres prefix tsquery for the generated `search` columns:
 * "pix tun" → "pix:* & tun:*". It applies the same normalization as `private.search_normalize()`
 * in the database (migration 20261006000100): Latin accents removed, Arabic alef forms unified,
 * ة → ه, ى → ي, harakat and tatweel dropped. Only letters and digits survive, so user input can never
 * inject tsquery operators. Returns null when nothing searchable is left.
 */
export function normalizeForSearch(input: string): string {
  return input
    .toLowerCase()
    .replace(/\p{Script=Latin}/gu, (char) => char.normalize('NFD').replace(/\p{M}/gu, ''))
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي');
}

export function toPrefixTsQuery(input: string | null | undefined, maxTerms = 6): string | null {
  if (!input) return null;
  const terms = normalizeForSearch(input)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((term) => term.length > 0)
    .slice(0, maxTerms);
  return terms.length > 0 ? terms.map((term) => `${term}:*`).join(' & ') : null;
}
