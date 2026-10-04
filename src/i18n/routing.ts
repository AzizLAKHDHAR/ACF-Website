import { defineRouting } from 'next-intl/routing';

export const locales = ['ar', 'fr', 'en'] as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  // Provisional default (D-005): used when neither the cookie nor Accept-Language matches.
  defaultLocale: 'ar',
  localePrefix: 'always',
  // next-intl's default is a session cookie; keep the visitor's explicit choice for a year.
  localeCookie: { maxAge: 60 * 60 * 24 * 365 },
});
