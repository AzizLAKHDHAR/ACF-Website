import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/components/content/empty-state';
import { Pill } from '@/components/content/pill';
import { AreaPage, AreaSection } from '@/components/layout/area-page';
import { listPolls } from '@/features/polls/queries';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { requireRole } from '@/lib/auth/guards';
import { formatDateTime } from '@/lib/content/format';
import { resolveLocaleParam } from '@/lib/i18n-params';
import { areaMetadata } from '@/lib/routes/area-metadata';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/member/polls'>): Promise<Metadata> {
  return areaMetadata(await resolveLocaleParam(params), 'member', 'polls');
}

type PollItem = Awaited<ReturnType<typeof listPolls>>[number];

async function PollList({ polls, locale }: { polls: PollItem[]; locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'memberSpace' });
  return (
    <ul className="flex flex-col gap-4">
      {polls.map((poll) => (
        <li key={poll.id}>
          <article
            aria-labelledby={`poll-${poll.id}`}
            className="flex flex-col gap-3 rounded-2xl border-2 p-5"
            data-testid="poll"
          >
            <div className="flex flex-wrap items-center gap-2">
              {poll.open ? (
                <Pill tone={poll.answered ? 'primary' : 'strong'} testId="poll-answered">
                  {poll.answered ? t('polls.answered') : t('polls.notAnswered')}
                </Pill>
              ) : (
                <Pill>{t('polls.closed')}</Pill>
              )}
              {poll.audience === 'board' ? (
                <Pill tone="strong">{t('audience.boardOnly')}</Pill>
              ) : null}
            </div>
            <h3 id={`poll-${poll.id}`} className="text-lg font-bold" dir="auto">
              <Link
                href={`/member/polls/${poll.id}`}
                className="underline-offset-4 hover:underline"
              >
                {poll.title}
              </Link>
            </h3>
            <p className="flex flex-wrap gap-x-4 text-sm text-muted-foreground">
              <span>{t('polls.voters', { count: poll.voters })}</span>
              {poll.closes_at ? (
                <span>
                  {t(poll.open ? 'polls.closesAt' : 'polls.closedAt', {
                    date: formatDateTime(poll.closes_at, locale),
                  })}
                </span>
              ) : null}
            </p>
          </article>
        </li>
      ))}
    </ul>
  );
}

/** Open polls first (with whether the member has answered), then the closed ones and their results. */
export default async function PollsPage({ params }: PageProps<'/[locale]/member/polls'>) {
  const locale = await resolveLocaleParam(params);
  const user = await requireRole('member', { returnTo: '/member/polls' });
  const t = await getTranslations({ locale });
  const polls = await listPolls(user.id);
  const open = polls.filter((poll) => poll.open);
  const closed = polls.filter((poll) => !poll.open);

  return (
    <AreaPage
      title={t('areas.member.sections.polls.title')}
      description={t('areas.member.sections.polls.description')}
    >
      <AreaSection id="open-polls" title={t('memberSpace.polls.open')}>
        {open.length === 0 ? (
          <EmptyState>{t('memberSpace.polls.emptyOpen')}</EmptyState>
        ) : (
          <PollList polls={open} locale={locale} />
        )}
      </AreaSection>
      {closed.length > 0 ? (
        <AreaSection id="closed-polls" title={t('memberSpace.polls.closedHeading')}>
          <PollList polls={closed} locale={locale} />
        </AreaSection>
      ) : null}
    </AreaPage>
  );
}
