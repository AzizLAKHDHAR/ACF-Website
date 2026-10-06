import type { Metadata } from 'next';
import { MapPinIcon } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Avatar } from '@/components/content/avatar';
import { CardGrid } from '@/components/content/card-grid';
import { ClickToLoadEmbed } from '@/components/content/click-to-load-embed';
import { EmptyState } from '@/components/content/empty-state';
import { EventCard } from '@/components/content/event-card';
import { FilterForm } from '@/components/content/filter-form';
import { JsonLd } from '@/components/content/json-ld';
import { LocalizedText } from '@/components/content/localized-text';
import { PageHeader } from '@/components/content/page-header';
import { Pagination } from '@/components/content/pagination';
import { ProfileCard } from '@/components/content/profile-card';
import type { CatalogueSection } from '@/config/navigation';
import {
  getProfile,
  listGenres,
  listGovernorates,
  listProfileEvents,
  listProfiles,
  PAGE_SIZE,
  profileTypeBySection,
  type ProfileDetail,
} from '@/features/catalogue/queries';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { isSafeExternalUrl, toEmbed } from '@/lib/content/embeds';
import { startOfTodayInTunis } from '@/lib/content/format';
import { localizedText } from '@/lib/content/localized';
import { publicMediaUrl } from '@/lib/content/media';
import { parseListParams } from '@/lib/content/params';
import { publicEnv } from '@/lib/env';
import { resolveLocaleParam } from '@/lib/i18n-params';
import { pageMetadata } from '@/lib/metadata';
import { profileJsonLd } from '@/lib/seo/json-ld';

type ListProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
type DetailProps = { params: Promise<{ locale: string; slug: string }> };

/** Catalogue list: approved profiles of one type, with filters and pagination (roadmap phase 3). */
export function catalogueListRoute(section: CatalogueSection) {
  const type = profileTypeBySection[section];
  const path = `/${section}`;

  async function generateMetadata({ params }: ListProps): Promise<Metadata> {
    const locale = await resolveLocaleParam(params);
    const t = await getTranslations({ locale, namespace: `pages.${section}` });
    return pageMetadata({ locale, path, title: t('title'), description: t('description') });
  }

  async function Page({ params, searchParams }: ListProps) {
    const locale = await resolveLocaleParam(params);
    const filters = parseListParams(await searchParams);
    const t = await getTranslations({ locale });
    const [{ items, total }, genres, governorates] = await Promise.all([
      listProfiles(type, filters),
      type === 'artist' ? listGenres() : Promise.resolve(undefined),
      listGovernorates(),
    ]);

    return (
      <>
        <PageHeader
          title={t(`pages.${section}.title`)}
          description={t(`pages.${section}.description`)}
        />
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
          <FilterForm
            pathname={path}
            params={filters}
            genres={genres}
            governorates={governorates}
          />
          <p className="text-sm font-semibold" role="status">
            {t('content.results', { count: total })}
          </p>
          {items.length > 0 ? (
            <CardGrid label={t(`pages.${section}.title`)}>
              {items.map((profile) => (
                <li key={profile.id}>
                  <ProfileCard profile={profile} />
                </li>
              ))}
            </CardGrid>
          ) : (
            <EmptyState>{t('content.empty.profiles')}</EmptyState>
          )}
          <Pagination pathname={path} params={filters} total={total} pageSize={PAGE_SIZE} />
        </div>
      </>
    );
  }

  return { generateMetadata, Page };
}

function absoluteUrl(locale: Locale, path: string) {
  return `${publicEnv.NEXT_PUBLIC_SITE_URL}/${locale}${path}`;
}

function profileLinks(profile: ProfileDetail): { kind: string; url: string }[] {
  if (!Array.isArray(profile.links)) return [];
  return profile.links.flatMap((link) =>
    link && typeof link === 'object' && !Array.isArray(link) && isSafeExternalUrl(link.url)
      ? [{ kind: typeof link.kind === 'string' ? link.kind : 'website', url: String(link.url) }]
      : [],
  );
}

/** Catalogue detail page for one approved profile (artists, professionals, venues, studios). */
export function profileDetailRoute(section: CatalogueSection) {
  const type = profileTypeBySection[section];

  async function load(params: DetailProps['params']) {
    const locale = await resolveLocaleParam(params);
    const { slug } = await params;
    const profile = await getProfile(type, slug);
    if (!profile) notFound();
    return { locale, profile };
  }

  async function generateMetadata({ params }: DetailProps): Promise<Metadata> {
    const { locale, profile } = await load(params);
    const image = publicMediaUrl(profile.cover_path ?? profile.avatar_path);
    const metadata = pageMetadata({
      locale,
      path: `/${section}/${profile.slug}`,
      title: profile.display_name,
      description: localizedText(profile.tagline, locale) || profile.display_name,
    });
    return image
      ? { ...metadata, openGraph: { ...metadata.openGraph, images: [image] } }
      : metadata;
  }

  async function Page({ params }: DetailProps) {
    const { locale, profile } = await load(params);
    const t = await getTranslations({ locale });
    const events = await listProfileEvents(profile);
    const today = startOfTodayInTunis();
    const upcoming = events.filter((event) => event.starts_at >= today).reverse();
    const past = events.filter((event) => event.starts_at < today);
    const genres = profile.profile_genres.flatMap((entry) => (entry.genres ? [entry.genres] : []));
    const professions = profile.profile_professions.flatMap((entry) =>
      entry.professions ? [entry.professions] : [],
    );
    const links = profileLinks(profile);
    const embeds = links.flatMap((link) => {
      const embed = toEmbed(link.url);
      return embed ? [embed] : [];
    });
    const region = profile.governorates
      ? localizedText(profile.governorates.name, locale)
      : undefined;
    const place = [profile.city, region].filter(Boolean).join(', ');
    const url = absoluteUrl(locale, `/${section}/${profile.slug}`);

    return (
      <>
        <JsonLd
          data={profileJsonLd({
            type: profile.type,
            name: profile.display_name,
            url,
            description: localizedText(profile.tagline, locale) || undefined,
            image: publicMediaUrl(profile.avatar_path) ?? undefined,
            city: profile.city,
            region,
            genres: genres.map((genre) => localizedText(genre.name, 'en')),
            artistKind: profile.artist_details?.kind,
            address: profile.venue_details?.address ?? profile.studio_details?.address,
            sameAs: links.map((link) => link.url),
          })}
        />
        <PageHeader
          eyebrow={
            <Link href={`/${section}`} className="underline underline-offset-4">
              {t(`pages.${section}.title`)}
            </Link>
          }
          title={profile.display_name}
          titleDir="auto"
          description={<LocalizedText value={profile.tagline} locale={locale} as="p" />}
        >
          <div className="flex flex-wrap items-center gap-4">
            <Avatar
              name={profile.display_name}
              path={profile.avatar_path}
              className="size-20 text-2xl"
            />
            {place ? (
              <p className="inline-flex items-center gap-2 font-semibold" dir="auto">
                <MapPinIcon className="size-4" aria-hidden />
                {place}
              </p>
            ) : null}
          </div>
        </PageHeader>

        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-10 sm:px-6 lg:grid-cols-[2fr_1fr]">
          <div className="flex flex-col gap-10">
            <LocalizedText
              value={profile.bio}
              locale={locale}
              as="p"
              className="text-lg leading-relaxed whitespace-pre-line"
            />
            {embeds.length > 0 ? (
              <section aria-labelledby="listen-title" className="flex flex-col gap-4">
                <h2 id="listen-title" className="text-2xl font-extrabold">
                  {t('content.profile.listen')}
                </h2>
                {embeds.map((embed) => (
                  <ClickToLoadEmbed key={embed.src} embed={embed} />
                ))}
              </section>
            ) : null}
            {profile.type === 'artist' || profile.type === 'venue' ? (
              <section aria-labelledby="events-title" className="flex flex-col gap-4">
                <h2 id="events-title" className="text-2xl font-extrabold">
                  {t('content.profile.events')}
                </h2>
                {upcoming.length + past.length === 0 ? (
                  <p className="text-muted-foreground">{t('content.profile.noEvents')}</p>
                ) : (
                  <CardGrid>
                    {[...upcoming, ...past].map((event) => (
                      <li key={event.id}>
                        <EventCard event={event} />
                      </li>
                    ))}
                  </CardGrid>
                )}
              </section>
            ) : null}
          </div>

          <aside className="flex flex-col gap-6 rounded-2xl border-2 p-6 lg:self-start">
            {profile.artist_details ? (
              <p className="font-semibold">
                {t(
                  `content.profile.kind.${profile.artist_details.kind as 'solo' | 'band' | 'collective' | 'dj'}`,
                )}
                {profile.artist_details.formed_year ? (
                  <span className="block text-muted-foreground">
                    {t('content.profile.formed', {
                      year: String(profile.artist_details.formed_year),
                    })}
                  </span>
                ) : null}
              </p>
            ) : null}
            {profile.professional_details ? (
              <div className="flex flex-col gap-1">
                {profile.professional_details.years_experience != null ? (
                  <p>
                    {t('content.profile.experience', {
                      years: profile.professional_details.years_experience,
                    })}
                  </p>
                ) : null}
                {profile.professional_details.available_for_hire ? (
                  <p className="font-semibold">{t('content.profile.availableForHire')}</p>
                ) : null}
              </div>
            ) : null}
            {profile.venue_details ? (
              <div className="flex flex-col gap-1">
                {profile.venue_details.address ? (
                  <p dir="auto">{profile.venue_details.address}</p>
                ) : null}
                {profile.venue_details.capacity ? (
                  <p>{t('content.profile.capacity', { count: profile.venue_details.capacity })}</p>
                ) : null}
                {profile.venue_details.has_backline ? <p>{t('content.profile.backline')}</p> : null}
              </div>
            ) : null}
            {profile.studio_details && profile.studio_details.services.length > 0 ? (
              <div className="flex flex-col gap-2">
                <h2 className="text-sm font-semibold text-muted-foreground">
                  {t('content.profile.services')}
                </h2>
                <ul className="flex flex-wrap gap-2">
                  {profile.studio_details.services.map((service) => (
                    <li
                      key={service}
                      className="rounded-full border-2 px-3 py-1 text-sm font-semibold"
                    >
                      {t(
                        `content.profile.service.${service as 'recording' | 'mixing' | 'mastering' | 'rehearsal' | 'production'}`,
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {genres.length > 0 ? (
              <div className="flex flex-col gap-2">
                <h2 className="text-sm font-semibold text-muted-foreground">
                  {t('content.profile.genres')}
                </h2>
                <ul className="flex flex-wrap gap-2">
                  {genres.map((genre) => (
                    <li key={genre.slug}>
                      <Link
                        href={{ pathname: '/artists', query: { genre: genre.slug } }}
                        className="inline-block rounded-full bg-secondary px-3 py-1 text-sm font-semibold text-secondary-foreground"
                      >
                        {localizedText(genre.name, locale)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {professions.length > 0 ? (
              <div className="flex flex-col gap-2">
                <h2 className="text-sm font-semibold text-muted-foreground">
                  {t('content.profile.professions')}
                </h2>
                <ul className="flex flex-wrap gap-2">
                  {professions.map((profession) => (
                    <li
                      key={profession.slug}
                      className="rounded-full border-2 px-3 py-1 text-sm font-semibold"
                    >
                      {localizedText(profession.name, locale)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {links.length > 0 ? (
              <div className="flex flex-col gap-2">
                <h2 className="text-sm font-semibold text-muted-foreground">
                  {t('content.profile.links')}
                </h2>
                <ul className="flex flex-col gap-1">
                  {links.map((link) => (
                    <li key={link.url}>
                      <a
                        href={link.url}
                        rel="nofollow ugc noopener"
                        target="_blank"
                        className="font-semibold break-all underline underline-offset-4"
                      >
                        {new URL(link.url).hostname.replace(/^www\./, '')}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </aside>
        </div>
      </>
    );
  }

  return { generateMetadata, Page };
}
