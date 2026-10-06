import { describe, expect, it } from 'vitest';
import { articleJsonLd, eventJsonLd, profileJsonLd, serializeJsonLd } from './json-ld';

describe('JSON-LD', () => {
  it('maps profile types to schema.org types', () => {
    const base = { name: 'X', url: 'https://acf.example/fr/artists/x' };
    expect(
      profileJsonLd({ ...base, type: 'artist', artistKind: 'band', genres: ['Rock'] }),
    ).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'MusicGroup',
      genre: ['Rock'],
    });
    expect(profileJsonLd({ ...base, type: 'artist', artistKind: 'solo' })['@type']).toBe('Person');
    expect(profileJsonLd({ ...base, type: 'venue', city: 'Tunis' })).toMatchObject({
      '@type': 'MusicVenue',
      address: { '@type': 'PostalAddress', addressLocality: 'Tunis', addressCountry: 'TN' },
    });
  });

  it('describes events with location, performers and offers', () => {
    const event = eventJsonLd({
      name: 'Concert',
      url: 'https://acf.example/fr/events/concert',
      startDate: '2026-11-01T19:00:00Z',
      isFree: false,
      ticketUrl: 'https://tickets.example/x',
      venueName: 'Salle',
      city: 'Sousse',
      performers: [
        { name: 'Band', url: 'https://acf.example/fr/artists/band', type: 'MusicGroup' },
      ],
      organizerName: 'ACF',
      organizerUrl: 'https://acf.example',
      past: false,
    });
    expect(event).toMatchObject({
      '@type': 'MusicEvent',
      startDate: '2026-11-01T19:00:00Z',
      location: { '@type': 'Place', name: 'Salle' },
      offers: { '@type': 'Offer', url: 'https://tickets.example/x' },
      performer: [{ '@type': 'MusicGroup', name: 'Band' }],
    });
    expect(event).not.toHaveProperty('endDate');
  });

  it('describes articles', () => {
    expect(
      articleJsonLd({
        kind: 'blog',
        headline: 'Hello',
        url: 'u',
        datePublished: '2026-10-01T00:00:00Z',
        inLanguage: 'ar',
        authorName: 'Blog',
        publisherName: 'ACF',
        publisherUrl: 'p',
      }),
    ).toMatchObject({ '@type': 'BlogPosting', inLanguage: 'ar' });
  });

  it('escapes < so content cannot close the script tag', () => {
    expect(serializeJsonLd({ name: '</script><script>alert(1)</script>' })).not.toContain(
      '</script>',
    );
  });
});
