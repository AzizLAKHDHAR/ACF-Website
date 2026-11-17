import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/components/content/empty-state';
import { Markdown } from '@/components/content/markdown';
import { Pill } from '@/components/content/pill';
import { ActionForm } from '@/components/forms/action-form';
import { RadioGroupField } from '@/components/forms/fields';
import { AreaPage, AreaSection } from '@/components/layout/area-page';
import { votePoll } from '@/features/polls/actions';
import { getPoll, isPollOpen } from '@/features/polls/queries';
import { buildResults } from '@/features/polls/results';
import { pollVoteValues } from '@/features/polls/schemas';
import { intlLocale } from '@/i18n/locale';
import type { Locale } from '@/i18n/routing';
import { requireRole } from '@/lib/auth/guards';
import { formatDateTime, formatDateTimeRange, formatNumber } from '@/lib/content/format';
import { id as idSchema } from '@/lib/forms/schemas';
import { resolveLocaleParam } from '@/lib/i18n-params';
import { areaMetadata } from '@/lib/routes/area-metadata';

type Props = PageProps<'/[locale]/member/polls/[id]'>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const { id } = await params;
  const poll = idSchema.safeParse(id).success ? await getPoll(id) : null;
  return areaMetadata(locale, 'member', 'polls', {
    title: poll?.title,
    path: `/member/polls/${id}`,
  });
}

type Option = { label: string; starts_at: string | null; ends_at: string | null };

/** A slot: its time range (when it has one) and its label. */
function OptionName({ option, locale }: { option: Option; locale: Locale }) {
  return (
    <span className="flex flex-col">
      {option.starts_at ? (
        <time dateTime={option.starts_at} className="font-semibold">
          {formatDateTimeRange(option.starts_at, option.ends_at, locale)}
        </time>
      ) : null}
      {option.label ? (
        <span dir="auto" className={option.starts_at ? 'text-muted-foreground' : 'font-semibold'}>
          {option.label}
        </span>
      ) : null}
    </span>
  );
}

/** One poll: the member's answers per slot while it's open, and everyone's answers as a grid. */
export default async function PollPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  const { id } = await params;
  const user = await requireRole('member', { returnTo: '/member/polls' });
  if (!idSchema.safeParse(id).success) notFound();
  const poll = await getPoll(id);
  if (!poll) notFound();
  const t = await getTranslations({ locale });
  const open = isPollOpen(poll);
  const options = poll.poll_options;
  const results = buildResults(options, new Intl.Collator(intlLocale[locale]));
  const mine = results.voters.find((voter) => voter.userId === user.id)?.votes ?? {};
  const valueLabel = (value: (typeof pollVoteValues)[number]) =>
    t(`memberSpace.polls.values.${value}`);

  return (
    <AreaPage
      title={poll.title}
      titleDir="auto"
      back={{ href: '/member/polls', label: t('memberSpace.polls.back') }}
      description={
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={open ? 'strong' : 'neutral'}>
            {open ? t('memberSpace.polls.openBadge') : t('memberSpace.polls.closed')}
          </Pill>
          {poll.closes_at ? (
            <span>
              {t(open ? 'memberSpace.polls.closesAt' : 'memberSpace.polls.closedAt', {
                date: formatDateTime(poll.closes_at, locale),
              })}
            </span>
          ) : null}
        </div>
      }
    >
      {poll.description_md ? <Markdown>{poll.description_md}</Markdown> : null}

      <AreaSection id="your-votes" title={t('memberSpace.polls.yourAnswers')}>
        {options.length === 0 ? (
          <EmptyState>{t('memberSpace.polls.noOptions')}</EmptyState>
        ) : open ? (
          <ActionForm
            action={votePoll}
            hidden={{ pollId: poll.id }}
            submitLabel={t('memberSpace.polls.save')}
            className="rounded-2xl border-2 p-6"
            testId="vote-form"
          >
            <p className="text-sm text-muted-foreground">{t('memberSpace.polls.voteHint')}</p>
            {options.map((option) => (
              <RadioGroupField
                key={option.id}
                name={`vote.${option.id}`}
                legend={<OptionName option={option} locale={locale} />}
                options={[
                  ...pollVoteValues.map((value) => ({ value, label: valueLabel(value) })),
                  { value: '', label: t('memberSpace.polls.noAnswer') },
                ]}
                defaultValue={mine[option.id] ?? ''}
                className="border-t pt-4"
              />
            ))}
          </ActionForm>
        ) : (
          <p className="rounded-2xl border-2 border-dashed p-6 text-muted-foreground">
            {t('memberSpace.polls.locked')}
          </p>
        )}
      </AreaSection>

      <AreaSection id="results" title={t('memberSpace.polls.results')}>
        {results.voters.length === 0 ? (
          <EmptyState>{t('memberSpace.polls.noVotes')}</EmptyState>
        ) : (
          <div
            className="overflow-x-auto rounded-2xl border-2"
            role="region"
            aria-labelledby="results"
            tabIndex={0}
          >
            <table className="w-full text-sm" data-testid="results">
              <thead className="bg-muted">
                <tr>
                  <th scope="col" className="p-3 text-start">
                    {t('memberSpace.polls.member')}
                  </th>
                  {options.map((option) => (
                    <th key={option.id} scope="col" className="p-3 text-start align-top">
                      <OptionName option={option} locale={locale} />
                      {results.best.includes(option.id) ? (
                        <Pill tone="primary" className="mt-2">
                          {t('memberSpace.polls.best')}
                        </Pill>
                      ) : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.voters.map((voter) => (
                  <tr key={voter.userId} className="border-t">
                    <th scope="row" className="p-3 text-start font-semibold">
                      <bdi>{voter.name || t('memberSpace.formerMember')}</bdi>
                    </th>
                    {options.map((option) => {
                      const value = voter.votes[option.id];
                      return (
                        <td key={option.id} className="p-3">
                          {value ? valueLabel(value) : '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 bg-muted">
                <tr>
                  <th scope="row" className="p-3 text-start">
                    {t('memberSpace.polls.totals')}
                  </th>
                  {options.map((option) => {
                    const tally = results.totals[option.id] ?? { yes: 0, maybe: 0, no: 0 };
                    return (
                      <td key={option.id} className="p-3" data-testid="poll-total">
                        {t('memberSpace.polls.tally', {
                          yes: formatNumber(tally.yes, locale),
                          maybe: formatNumber(tally.maybe, locale),
                        })}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </AreaSection>
    </AreaPage>
  );
}
