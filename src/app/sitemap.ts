import type { MetadataRoute } from 'next';
import { infoPages, legalPages, publicHref, publicSections } from '@/config/navigation';
import { listProfileSlugs, sectionByProfileType } from '@/features/catalogue/queries';
import { listEventSlugs } from '@/features/events/queries';
import { listPostSlugs } from '@/features/posts/queries';
import { routing, type Locale } from '@/i18n/routing';
import { publicEnv } from '@/lib/env';

// Static sections plus every approved profile, published event and published post. The reads go
// through the tagged public cache, so the webhook that refreshes pages refreshes this too.
export const revalidate = 3600;

const publicPaths = [
  '',
  ...[...publicSections, ...infoPages, ...legalPages].map((key) => publicHref[key]),
];

const url = (locale: string, path: string) => `${publicEnv.NEXT_PUBLIC_SITE_URL}/${locale}${path}`;

/** A page that exists in every locale under the same path. */
function everyLocale(
  path: string,
  extra: Partial<MetadataRoute.Sitemap[number]> = {},
): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(routing.locales.map((l) => [l, url(l, path)]));
  return routing.locales.map((locale) => ({
    url: url(locale, path),
    alternates: { languages },
    ...extra,
  }));
}

const isLocale = (value: string): value is Locale =>
  (routing.locales as readonly string[]).includes(value);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [profiles, events, posts] = await Promise.all([
    listProfileSlugs(),
    listEventSlugs(),
    listPostSlugs(),
  ]);

  const statics = publicPaths.flatMap((path) =>
    everyLocale(path, {
      changeFrequency: path === '' ? 'daily' : 'weekly',
      priority: path === '' ? 1 : 0.7,
    }),
  );
  const profileEntries = profiles.flatMap((profile) =>
    everyLocale(`/${sectionByProfileType[profile.type]}/${profile.slug}`, {
      lastModified: profile.updated_at,
      priority: 0.6,
    }),
  );
  const eventEntries = events.flatMap((event) =>
    everyLocale(`/events/${event.slug}`, { lastModified: event.updated_at, priority: 0.6 }),
  );

  // News: one row per locale; its translations (same group) are its hreflang alternates.
  const news = posts.filter((post) => post.kind === 'news' && isLocale(post.locale));
  const newsEntries = news.map((post) => ({
    url: url(post.locale, `/news/${post.slug}`),
    lastModified: post.updated_at,
    priority: 0.5,
    alternates: {
      languages: Object.fromEntries(
        news
          .filter((other) => other.translation_group === post.translation_group)
          .map((other) => [other.locale, url(other.locale, `/news/${other.slug}`)]),
      ),
    },
  }));
  // Blog posts are written in one language: listed once, under that language.
  const blogEntries = posts.flatMap((post) =>
    post.kind === 'blog' && post.blog && isLocale(post.locale)
      ? [
          {
            url: url(post.locale, `/blogs/${post.blog.slug}/${post.slug}`),
            lastModified: post.updated_at,
            priority: 0.5,
          },
        ]
      : [],
  );

  return [...statics, ...profileEntries, ...eventEntries, ...newsEntries, ...blogEntries];
}
