import type { MetadataRoute } from 'next';
import { infoPages, legalPages, publicHref, publicSections } from '@/config/navigation';
import { routing } from '@/i18n/routing';
import { publicEnv } from '@/lib/env';

const publicPaths = [
  '',
  ...[...publicSections, ...infoPages, ...legalPages].map((key) => publicHref[key]),
];

export default function sitemap(): MetadataRoute.Sitemap {
  const url = (locale: string, path: string) =>
    `${publicEnv.NEXT_PUBLIC_SITE_URL}/${locale}${path}`;

  return publicPaths.flatMap((path) =>
    routing.locales.map((locale) => ({
      url: url(locale, path),
      changeFrequency: path === '' ? 'daily' : 'weekly',
      priority: path === '' ? 1 : 0.7,
      alternates: {
        languages: Object.fromEntries(routing.locales.map((l) => [l, url(l, path)])),
      },
    })),
  );
}
