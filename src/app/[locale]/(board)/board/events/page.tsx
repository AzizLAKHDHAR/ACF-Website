import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/components/content/empty-state';
import { ActionForm } from '@/components/forms/action-form';
import { SelectField, TextAreaField } from '@/components/forms/fields';
import { decideEvent } from '@/features/events/actions';
import { listPendingProposals } from '@/features/events/proposals';
import { routing } from '@/i18n/routing';
import { requireRole } from '@/lib/auth/guards';
import { formatDateTime } from '@/lib/content/format';
import { localizedText } from '@/lib/content/localized';
import { resolveLocaleParam } from '@/lib/i18n-params';
import { localizedPath } from '@/lib/metadata';
import type { Json } from '@/types/database';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/board/events'>): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const t = await getTranslations({ locale, namespace: 'areas.board.sections.events' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: { canonical: localizedPath(locale, '/board/events') },
  };
}

function localeEntries(map: Json): { locale: string; text: string }[] {
  if (!map || typeof map !== 'object' || Array.isArray(map)) return [];
  return routing.locales.flatMap((locale) => {
    const value = map[locale];
    return typeof value === 'string' && value.trim() ? [{ locale, text: value }] : [];
  });
}

/** Event proposals from approved artists and venues, for the board to publish or turn down. */
export default async function BoardEventsPage({ params }: PageProps<'/[locale]/board/events'>) {
  const locale = await resolveLocaleParam(params);
  await requireRole('board', { returnTo: '/board/events' });
  const t = await getTranslations({ locale });
  const proposals = await listPendingProposals();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight">
          {t('areas.board.sections.events.title')}
        </h1>
        <p className="text-muted-foreground">{t('areas.board.sections.events.description')}</p>
      </header>
      <h2 className="text-xl font-bold">
        {t('proposals.board.pendingHeading', { count: proposals.length })}
      </h2>
      {proposals.length === 0 ? (
        <EmptyState>{t('proposals.board.empty')}</EmptyState>
      ) : (
        <ul className="flex flex-col gap-6">
          {proposals.map((event) => {
            const lineup = event.event_lineup
              .map((entry) => entry.public_profiles?.display_name)
              .filter(Boolean)
              .join(', ');
            return (
              <li key={event.id}>
                <article
                  aria-labelledby={`event-${event.id}`}
                  className="flex flex-col gap-4 rounded-2xl border-2 p-6"
                  data-testid="proposal"
                >
                  <div className="flex flex-col gap-1">
                    <h3 id={`event-${event.id}`} className="text-lg font-bold" dir="auto">
                      {localizedText(event.title, locale)}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      <time dateTime={event.starts_at}>
                        {formatDateTime(event.starts_at, locale)}
                      </time>
                    </p>
                  </div>
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="font-semibold">{t('proposals.board.proposer')}</dt>
                      <dd>
                        <bdi>{event.proposer?.display_name ?? '—'}</bdi>
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold">{t('proposals.fields.venue')}</dt>
                      <dd dir="auto">{event.venue?.display_name ?? event.venue_text ?? '—'}</dd>
                    </div>
                    {lineup ? (
                      <div>
                        <dt className="font-semibold">{t('proposals.board.lineup')}</dt>
                        <dd dir="auto">{lineup}</dd>
                      </div>
                    ) : null}
                    {event.ticket_url ? (
                      <div>
                        <dt className="font-semibold">{t('proposals.fields.ticketUrl')}</dt>
                        <dd dir="ltr" className="break-all">
                          <a
                            href={event.ticket_url}
                            rel="nofollow ugc noopener noreferrer"
                            target="_blank"
                            className="underline"
                          >
                            {event.ticket_url}
                          </a>
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                  {localeEntries(event.description).map((entry) => (
                    <p
                      key={entry.locale}
                      lang={entry.locale}
                      dir="auto"
                      className="text-sm whitespace-pre-line"
                    >
                      {entry.text}
                    </p>
                  ))}
                  <ActionForm
                    action={decideEvent}
                    hidden={{ eventId: event.id }}
                    submitLabel={t('review.decide')}
                    className="border-t pt-4"
                  >
                    <SelectField
                      id={`decision-${event.id}`}
                      name="decision"
                      label={t('review.decision')}
                      options={[
                        { value: 'published', label: t('proposals.board.publish') },
                        { value: 'unpublished', label: t('proposals.board.reject') },
                      ]}
                    />
                    <TextAreaField
                      id={`note-${event.id}`}
                      name="notePublic"
                      label={t('review.notePublic')}
                      hint={t('proposals.board.noteHint')}
                      rows={3}
                      maxLength={2000}
                      dir="auto"
                    />
                  </ActionForm>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
