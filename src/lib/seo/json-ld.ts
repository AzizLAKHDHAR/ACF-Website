// schema.org JSON-LD for public detail pages (roadmap phase 3). Builders return plain objects; the
// <JsonLd> component serializes them safely.

type Thing = Record<string, unknown>;

const compact = (value: Thing): Thing =>
  Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  );

export type ProfileForJsonLd = {
  type: 'artist' | 'professional' | 'venue' | 'studio' | 'blog';
  name: string;
  url: string;
  description?: string;
  image?: string;
  city?: string | null;
  region?: string;
  genres?: string[];
  artistKind?: string | null;
  address?: string | null;
  sameAs?: string[];
};

export function profileJsonLd(profile: ProfileForJsonLd): Thing {
  const address =
    profile.city || profile.region || profile.address
      ? compact({
          '@type': 'PostalAddress',
          streetAddress: profile.address ?? undefined,
          addressLocality: profile.city ?? undefined,
          addressRegion: profile.region,
          addressCountry: 'TN',
        })
      : undefined;
  const type = {
    artist: profile.artistKind === 'solo' || profile.artistKind === 'dj' ? 'Person' : 'MusicGroup',
    professional: 'Person',
    venue: 'MusicVenue',
    studio: 'LocalBusiness',
    blog: 'Blog',
  }[profile.type];
  return compact({
    '@context': 'https://schema.org',
    '@type': type,
    name: profile.name,
    url: profile.url,
    description: profile.description,
    image: profile.image,
    genre: type === 'MusicGroup' && profile.genres?.length ? profile.genres : undefined,
    address: type === 'MusicVenue' || type === 'LocalBusiness' ? address : undefined,
    homeLocation:
      type === 'Person' || type === 'MusicGroup'
        ? address && compact({ '@type': 'Place', address })
        : undefined,
    sameAs: profile.sameAs?.length ? profile.sameAs : undefined,
  });
}

export type EventForJsonLd = {
  name: string;
  url: string;
  startDate: string;
  endDate?: string | null;
  description?: string;
  image?: string;
  venueName?: string | null;
  venueAddress?: string | null;
  city?: string | null;
  region?: string;
  isFree: boolean;
  ticketUrl?: string | null;
  performers: { name: string; url: string; type: 'MusicGroup' | 'Person' }[];
  organizerName: string;
  organizerUrl: string;
  past: boolean;
};

export function eventJsonLd(event: EventForJsonLd): Thing {
  return compact({
    '@context': 'https://schema.org',
    '@type': 'MusicEvent',
    name: event.name,
    url: event.url,
    startDate: event.startDate,
    endDate: event.endDate ?? undefined,
    description: event.description,
    image: event.image,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: compact({
      '@type': 'Place',
      name: event.venueName ?? event.city ?? event.region ?? 'Tunisia',
      address: compact({
        '@type': 'PostalAddress',
        streetAddress: event.venueAddress ?? undefined,
        addressLocality: event.city ?? undefined,
        addressRegion: event.region,
        addressCountry: 'TN',
      }),
    }),
    isAccessibleForFree: event.isFree,
    offers:
      event.ticketUrl && !event.past
        ? compact({
            '@type': 'Offer',
            url: event.ticketUrl,
            availability: 'https://schema.org/InStock',
          })
        : undefined,
    performer: event.performers.length
      ? event.performers.map((performer) => ({
          '@type': performer.type,
          name: performer.name,
          url: performer.url,
        }))
      : undefined,
    organizer: { '@type': 'Organization', name: event.organizerName, url: event.organizerUrl },
  });
}

export type ArticleForJsonLd = {
  kind: 'news' | 'blog';
  headline: string;
  url: string;
  datePublished: string;
  dateModified?: string;
  description?: string | null;
  image?: string;
  inLanguage: string;
  authorName: string;
  publisherName: string;
  publisherUrl: string;
};

export function articleJsonLd(article: ArticleForJsonLd): Thing {
  return compact({
    '@context': 'https://schema.org',
    '@type': article.kind === 'news' ? 'NewsArticle' : 'BlogPosting',
    headline: article.headline.slice(0, 110),
    url: article.url,
    mainEntityOfPage: article.url,
    datePublished: article.datePublished,
    dateModified: article.dateModified,
    description: article.description ?? undefined,
    image: article.image,
    inLanguage: article.inLanguage,
    author: {
      '@type': article.kind === 'news' ? 'Organization' : 'Person',
      name: article.authorName,
    },
    publisher: { '@type': 'Organization', name: article.publisherName, url: article.publisherUrl },
  });
}

/** Serializes for a <script type="application/ld+json">: `<` is escaped so text can't close the tag. */
export function serializeJsonLd(data: Thing): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
