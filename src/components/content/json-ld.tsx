import { serializeJsonLd } from '@/lib/seo/json-ld';

/** schema.org structured data for search engines. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  // The content is JSON we build ourselves, with `<` escaped by serializeJsonLd.
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
