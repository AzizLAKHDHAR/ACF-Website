import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { CardGrid } from '@/components/content/card-grid';
import { EmptyState } from '@/components/content/empty-state';
import { EventCard } from '@/components/content/event-card';
import { FilterForm } from '@/components/content/filter-form';
import { PageHeader } from '@/components/content/page-header';
import { Pagination } from '@/components/content/pagination';
import { listGovernorates } from '@/features/catalogue/queries';
import { EVENTS_PAGE_SIZE, listEvents } from '@/features/events/queries';
import { parseListParams } from '@/lib/content/params';
import { resolveLocaleParam } from '@/lib/i18n-params';
import { pageMetadata } from '@/lib/metadata';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/events'>): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const t = await getTranslations({ locale, namespace: 'pages.events' });
  return pageMetadata({
    locale,
    path: '/events',
    title: t('title'),
    description: t('description'),
  });
}

export default async function EventsPage({ params, searchParams }: PageProps<'/[locale]/events'>) {
  const locale = await resolveLocaleParam(params);
  const filters = parseListParams(await searchParams);
  const t = await getTranslations({ locale });
  const [{ items, total }, governorates] = await Promise.all([
    listEvents(filters),
    listGovernorates(),
  ]);

  return (
    <>
      <PageHeader title={t('pages.events.title')} description={t('pages.events.description')} />
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
        <FilterForm pathname="/events" params={filters} governorates={governorates} dates when />
        <p className="text-sm font-semibold" role="status">
          {t('content.results', { count: total })}
        </p>
        {items.length > 0 ? (
          <CardGrid label={t('pages.events.title')}>
            {items.map((event) => (
              <li key={event.id}>
                <EventCard event={event} />
              </li>
            ))}
          </CardGrid>
        ) : (
          <EmptyState>{t('content.empty.events')}</EmptyState>
        )}
        <Pagination pathname="/events" params={filters} total={total} pageSize={EVENTS_PAGE_SIZE} />
      </div>
    </>
  );
}
