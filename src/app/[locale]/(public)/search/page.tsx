import type { Metadata } from 'next';
import { SearchIcon } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { CardGrid } from '@/components/content/card-grid';
import { EmptyState } from '@/components/content/empty-state';
import { EventCard } from '@/components/content/event-card';
import { PageHeader } from '@/components/content/page-header';
import { ProfileCard } from '@/components/content/profile-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { searchProfiles } from '@/features/catalogue/queries';
import { searchEvents } from '@/features/events/queries';
import { getPathname } from '@/i18n/navigation';
import { parseListParams } from '@/lib/content/params';
import { resolveLocaleParam } from '@/lib/i18n-params';
import { pageMetadata } from '@/lib/metadata';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/search'>): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const t = await getTranslations({ locale, namespace: 'pages.search' });
  // Result pages are endless query variations: keep them out of the index.
  return pageMetadata({
    locale,
    path: '/search',
    title: t('title'),
    description: t('description'),
    noindex: true,
  });
}

export default async function SearchPage({ params, searchParams }: PageProps<'/[locale]/search'>) {
  const locale = await resolveLocaleParam(params);
  const { q } = parseListParams(await searchParams);
  const t = await getTranslations({ locale });
  const [profiles, events] = q ? await Promise.all([searchProfiles(q), searchEvents(q)]) : [[], []];

  return (
    <>
      <PageHeader title={t('content.search.title')} description={t('content.search.description')}>
        <form
          action={getPathname({ href: '/search', locale })}
          method="get"
          role="search"
          className="flex max-w-2xl gap-3"
        >
          <label htmlFor="search-q" className="sr-only">
            {t('content.search.label')}
          </label>
          <Input
            id="search-q"
            name="q"
            type="search"
            defaultValue={q ?? ''}
            maxLength={100}
            className="bg-background"
          />
          <Button type="submit">
            <SearchIcon aria-hidden />
            {t('content.search.submit')}
          </Button>
        </form>
      </PageHeader>
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-10 sm:px-6">
        {!q ? (
          <EmptyState>{t('content.search.hint')}</EmptyState>
        ) : profiles.length + events.length === 0 ? (
          <EmptyState>{t('content.search.none', { query: q })}</EmptyState>
        ) : (
          <>
            <p className="sr-only" role="status">
              {t('content.results', { count: profiles.length + events.length })}
            </p>
            {profiles.length > 0 ? (
              <section aria-labelledby="profiles-title" className="flex flex-col gap-4">
                <h2 id="profiles-title" className="text-2xl font-extrabold">
                  {t('content.search.profiles')}
                </h2>
                <CardGrid>
                  {profiles.map((profile) => (
                    <li key={profile.id}>
                      <ProfileCard profile={profile} />
                    </li>
                  ))}
                </CardGrid>
              </section>
            ) : null}
            {events.length > 0 ? (
              <section aria-labelledby="events-title" className="flex flex-col gap-4">
                <h2 id="events-title" className="text-2xl font-extrabold">
                  {t('content.search.events')}
                </h2>
                <CardGrid>
                  {events.map((event) => (
                    <li key={event.id}>
                      <EventCard event={event} />
                    </li>
                  ))}
                </CardGrid>
              </section>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}
