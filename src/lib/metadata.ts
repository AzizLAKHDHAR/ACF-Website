import type { Metadata } from 'next';
import { routing, type Locale } from '@/i18n/routing';
import { openGraphLocale } from '@/i18n/locale';

/** Locale-prefixed path, e.g. ('fr', '/news') → '/fr/news' and ('fr', '') → '/fr'. */
export function localizedPath(locale: Locale, path: string): string {
  return `/${locale}${path}`;
}

/** Canonical URL, hreflang alternates and Open Graph for a page that exists in every locale. */
export function pageMetadata({
  locale,
  path,
  title,
  description,
  noindex = false,
}: {
  locale: Locale;
  /** Path without the locale prefix; '' for the home page. */
  path: string;
  title?: string;
  description: string;
  noindex?: boolean;
}): Metadata {
  const languages: Record<string, string> = Object.fromEntries(
    routing.locales.map((l) => [l, localizedPath(l, path)]),
  );
  languages['x-default'] = localizedPath(routing.defaultLocale, path);

  return {
    ...(title ? { title } : {}),
    description,
    alternates: { canonical: localizedPath(locale, path), languages },
    openGraph: {
      ...(title ? { title } : {}),
      description,
      locale: openGraphLocale[locale],
      alternateLocale: routing.locales.filter((l) => l !== locale).map((l) => openGraphLocale[l]),
      url: localizedPath(locale, path),
      type: 'website',
    },
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
  };
}
