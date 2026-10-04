import { defineRouting } from 'next-intl/routing';

export const locales = ['ar', 'fr', 'en'] as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  // Used when neither the cookie nor Accept-Language matches (D-043).
  defaultLocale: 'fr',
  localePrefix: 'always',
  // next-intl's default is a session cookie; keep the visitor's explicit choice for a year.
  localeCookie: { maxAge: 60 * 60 * 24 * 365 },
});
