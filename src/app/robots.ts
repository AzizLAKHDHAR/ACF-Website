import type { MetadataRoute } from 'next';
import { publicEnv } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Hidden areas and auth pages are also noindex; see next.config.ts and docs/roles.md.
        disallow: [
          '/api/',
          '/*/account',
          '/*/member',
          '/*/board',
          '/*/admin',
          '/*/login',
          '/*/signup',
        ],
      },
    ],
    sitemap: `${publicEnv.NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
  };
}
