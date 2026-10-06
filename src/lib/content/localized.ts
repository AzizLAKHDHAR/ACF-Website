import type { Locale } from '@/i18n/routing';
import type { Json } from '@/types/database';

// Fallback chain for translatable short fields stored as {ar, fr, en} maps (CLAUDE.md → i18n):
// requested locale → fr → ar → en.
const fallbackOrder: Record<Locale, Locale[]> = {
  fr: ['fr', 'ar', 'en'],
  ar: ['ar', 'fr', 'en'],
  en: ['en', 'fr', 'ar'],
};

export type LocalizedText = { text: string; locale: Locale } | null;

/** The best available translation of a locale map, with the locale it is actually in (for `lang`/`dir`). */
export function localized(map: Json | null | undefined, locale: Locale): LocalizedText {
  if (!map || typeof map !== 'object' || Array.isArray(map)) return null;
  for (const candidate of fallbackOrder[locale]) {
    const value = map[candidate];
    if (typeof value === 'string' && value.trim() !== '') return { text: value, locale: candidate };
  }
  return null;
}

/** Plain string version of `localized()`, empty when nothing is available. */
export function localizedText(map: Json | null | undefined, locale: Locale): string {
  return localized(map, locale)?.text ?? '';
}
