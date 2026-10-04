import type { Locale } from './routing';

export type Direction = 'rtl' | 'ltr';

export function getDirection(locale: Locale): Direction {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

/** BCP 47 tags used for `Intl` formatting and Open Graph (docs/architecture.md §5). */
export const intlLocale: Record<Locale, string> = {
  ar: 'ar-TN',
  fr: 'fr-TN',
  en: 'en',
};

export const openGraphLocale: Record<Locale, string> = {
  ar: 'ar_TN',
  fr: 'fr_TN',
  en: 'en_US',
};
