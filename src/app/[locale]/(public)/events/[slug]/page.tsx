import type { Metadata } from 'next';
import { CalendarIcon, MapPinIcon, TicketIcon } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { JsonLd } from '@/components/content/json-ld';
import { LocalizedText } from '@/components/content/localized-text';
import { PageHeader } from '@/components/content/page-header';
import { Button } from '@/components/ui/button';
import { sectionByProfileType } from '@/features/catalogue/queries';
import { getEvent } from '@/features/events/queries';
import { Link } from '@/i18n/navigation';
import { isSafeExternalUrl } from '@/lib/content/embeds';
import { formatDateTime, startOfTodayInTunis } from '@/lib/content/format';
import { localizedText } from '@/lib/content/localized';
import { publicMediaUrl } from '@/lib/content/media';
import { publicEnv } from '@/lib/env';
import { resolveLocaleParam } from '@/lib/i18n-params';
import { pageMetadata } from '@/lib/metadata';
import { eventJsonLd } from '@/lib/seo/json-ld';

export const revalidate = 300;
export function generateStaticParams() {
  return [];
}

async function load(params: PageProps<'/[locale]/events/[slug]'>['params']) {
  const locale = await resolveLocaleParam(params);
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) notFound();
  return { locale, event };
}

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/events/[slug]'>): Promise<Metadata> {
  const { locale, event } = await load(params);
  const title = localizedText(event.title, locale);
  const image = publicMediaUrl(event.cover_path);
  const metadata = pageMetadata({
    locale,
    path: `/events/${event.slug}`,
    title,
    description:
      localizedText(event.description, locale) ||
      `${title} · ${formatDateTime(event.starts_at, locale)}`,
  });
  return image ? { ...metadata, openGraph: { ...metadata.openGraph, images: [image] } } : metadata;
}

export default async function EventPage({ params }: PageProps<'/[locale]/events/[slug]'>) {
  const { locale, event } = await load(params);
  const t = await getTranslations({ locale });
  const past = event.starts_at < startOfTodayInTunis();
  const region = event.governorates ? localizedText(event.governorates.name, locale) : undefined;
  const venueName = event.venue?.display_name ?? event.venue_text;
  const site = publicEnv.NEXT_PUBLIC_SITE_URL;
  const ticketUrl =
    event.ticket_url && isSafeExternalUrl(event.ticket_url) ? event.ticket_url : null;

  return (
    <>
      <JsonLd
        data={eventJsonLd({
          name: localizedText(event.title, locale),
          url: `${site}/${locale}/events/${event.slug}`,
          startDate: event.starts_at,
          endDate: event.ends_at,
          description: localizedText(event.description, locale) || undefined,
          image: publicMediaUrl(event.cover_path) ?? undefined,
          venueName,
          venueAddress: event.venue?.venue_details?.address,
          city: event.venue?.city,
          region,
          isFree: event.is_free,
          ticketUrl,
          performers: event.event_lineup.flatMap((entry) =>
            entry.public_profiles
              ? [
                  {
                    name: entry.public_profiles.display_name,
                    url: `${site}/${locale}/${sectionByProfileType[entry.public_profiles.type]}/${entry.public_profiles.slug}`,
                    type: 'MusicGroup' as const,
                  },
                ]
              : [],
          ),
          organizerName: t('metadata.siteName'),
          organizerUrl: `${site}/${locale}`,
          past,
        })}
      />
      <PageHeader
        eyebrow={
          <Link href="/events" className="underline underline-offset-4">
            {t('pages.events.title')}
          </Link>
        }
        title={<LocalizedText value={event.title} locale={locale} />}
      >
        <ul className="flex flex-col gap-2 text-lg font-semibold">
          <li className="inline-flex items-center gap-2">
            <CalendarIcon className="size-5" aria-hidden />
            <time dateTime={event.starts_at}>{formatDateTime(event.starts_at, locale)}</time>
          </li>
          {venueName || region ? (
            <li className="inline-flex items-center gap-2">
              <MapPinIcon className="size-5" aria-hidden />
              {event.venue ? (
                <Link
                  href={`/venues/${event.venue.slug}`}
                  className="underline underline-offset-4"
                  dir="auto"
                >
                  {event.venue.display_name}
                </Link>
              ) : (
                <span dir="auto">{venueName}</span>
              )}
              {region ? <span className="text-muted-foreground">· {region}</span> : null}
            </li>
          ) : null}
        </ul>
        <div className="flex flex-wrap gap-3">
          {event.is_free ? (
            <span className="rounded-full bg-secondary px-3 py-1 text-sm font-semibold text-secondary-foreground">
              {t('content.event.free')}
            </span>
          ) : null}
          {event.organized_by_acf ? (
            <span className="rounded-full border-2 border-primary-border bg-brand px-3 py-1 text-sm font-semibold text-brand-foreground">
              {t('content.event.byAcf')}
            </span>
          ) : null}
        </div>
      </PageHeader>

      <div className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-10 sm:px-6">
        {past ? (
          <p role="status" className="rounded-xl border-2 px-4 py-3 font-semibold">
            {t('content.event.past')}
          </p>
        ) : ticketUrl ? (
          <div>
            <Button asChild size="lg">
              <a href={ticketUrl} rel="nofollow ugc noopener" target="_blank">
                <TicketIcon aria-hidden />
                {t('content.event.tickets')}
              </a>
            </Button>
          </div>
        ) : null}
        <LocalizedText
          value={event.description}
          locale={locale}
          as="p"
          className="text-lg leading-relaxed whitespace-pre-line"
        />
        {event.event_lineup.length > 0 ? (
          <section aria-labelledby="lineup-title" className="flex flex-col gap-4">
            <h2 id="lineup-title" className="text-2xl font-extrabold">
              {t('content.event.lineup')}
            </h2>
            <ul className="flex flex-wrap gap-3">
              {event.event_lineup.map((entry) =>
                entry.public_profiles ? (
                  <li key={entry.public_profiles.slug}>
                    <Link
                      href={`/${sectionByProfileType[entry.public_profiles.type]}/${entry.public_profiles.slug}`}
                      className="inline-block rounded-full border-2 border-foreground px-4 py-2 font-semibold hover:bg-accent hover:text-accent-foreground"
                      dir="auto"
                    >
                      {entry.public_profiles.display_name}
                    </Link>
                  </li>
                ) : null,
              )}
            </ul>
          </section>
        ) : null}
      </div>
    </>
  );
}
