import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Avatar } from '@/components/content/avatar';
import { EmptyState } from '@/components/content/empty-state';
import { StatusBadge } from '@/features/profiles/components/status-badge';
import { listReviewQueue } from '@/features/review/queries';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { requireRole } from '@/lib/auth/guards';
import { formatShortDate } from '@/lib/content/format';
import { localizedText } from '@/lib/content/localized';
import { resolveLocaleParam } from '@/lib/i18n-params';
import { localizedPath } from '@/lib/metadata';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/admin/approvals'>): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const t = await getTranslations({ locale, namespace: 'areas.admin.sections.approvals' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: { canonical: localizedPath(locale, '/admin/approvals') },
  };
}

type QueueItem = Awaited<ReturnType<typeof listReviewQueue>>['pending'][number];

async function QueueList({ items, locale }: { items: QueueItem[]; locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'review' });
  const tTypes = await getTranslations({ locale, namespace: 'profiles.types' });
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.id} className="flex flex-wrap items-center gap-4 rounded-2xl border-2 p-4">
          <Avatar name={item.display_name} path={item.avatar_path} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Link
              href={`/admin/approvals/${item.id}`}
              className="truncate text-lg font-bold underline-offset-4 hover:underline"
            >
              <bdi>{item.display_name}</bdi>
            </Link>
            <p className="text-sm text-muted-foreground">
              {tTypes(item.type)}
              {item.submitted_at ? (
                <>
                  {' · '}
                  {t('submittedOn', { date: formatShortDate(item.submitted_at, locale) })}
                </>
              ) : null}
            </p>
            {localizedText(item.tagline, locale) ? (
              <p className="line-clamp-2 text-sm" dir="auto">
                {localizedText(item.tagline, locale)}
              </p>
            ) : null}
          </div>
          <StatusBadge status={item.status} />
        </li>
      ))}
    </ul>
  );
}

/** The admin's profile approval queue (roles.md §5): pending first, then suspended profiles. */
export default async function ApprovalsPage({ params }: PageProps<'/[locale]/admin/approvals'>) {
  const locale = await resolveLocaleParam(params);
  await requireRole('admin', { returnTo: '/admin/approvals' });
  const t = await getTranslations({ locale });
  const { pending, suspended } = await listReviewQueue();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight">
          {t('areas.admin.sections.approvals.title')}
        </h1>
        <p className="text-muted-foreground">{t('areas.admin.sections.approvals.description')}</p>
      </header>
      <section aria-labelledby="pending" className="flex flex-col gap-4">
        <h2 id="pending" className="text-xl font-bold">
          {t('review.pendingHeading', { count: pending.length })}
        </h2>
        {pending.length ? (
          <QueueList items={pending} locale={locale} />
        ) : (
          <EmptyState>{t('review.emptyQueue')}</EmptyState>
        )}
      </section>
      {suspended.length ? (
        <section aria-labelledby="suspended" className="flex flex-col gap-4">
          <h2 id="suspended" className="text-xl font-bold">
            {t('review.suspendedHeading', { count: suspended.length })}
          </h2>
          <QueueList items={suspended} locale={locale} />
        </section>
      ) : null}
    </div>
  );
}
