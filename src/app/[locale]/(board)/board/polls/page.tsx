import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/components/content/empty-state';
import { Pill } from '@/components/content/pill';
import { ActionForm } from '@/components/forms/action-form';
import {
  FieldErrorMessage,
  SelectField,
  TextAreaField,
  TextField,
} from '@/components/forms/fields';
import { AreaPage, AreaSection } from '@/components/layout/area-page';
import { closePoll, createPoll, deletePoll } from '@/features/polls/actions';
import { listPolls } from '@/features/polls/queries';
import { MAX_POLL_OPTIONS, MIN_POLL_OPTIONS } from '@/features/polls/schemas';
import { Link } from '@/i18n/navigation';
import { requireRole } from '@/lib/auth/guards';
import { formatDateTime } from '@/lib/content/format';
import { audiences } from '@/lib/forms/schemas';
import { resolveLocaleParam } from '@/lib/i18n-params';
import { areaMetadata } from '@/lib/routes/area-metadata';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/board/polls'>): Promise<Metadata> {
  return areaMetadata(await resolveLocaleParam(params), 'board', 'polls');
}

const rows = Array.from({ length: MAX_POLL_OPTIONS }, (_, index) => index);

/** The board proposes time slots to members, then closes the poll (votes lock) or deletes it. */
export default async function BoardPollsPage({ params }: PageProps<'/[locale]/board/polls'>) {
  const locale = await resolveLocaleParam(params);
  const user = await requireRole('board', { returnTo: '/board/polls' });
  const t = await getTranslations({ locale });
  const polls = await listPolls(user.id);

  return (
    <AreaPage
      title={t('areas.board.sections.polls.title')}
      description={t('areas.board.sections.polls.description')}
    >
      <AreaSection id="new-poll" title={t('memberSpace.board.polls.new')}>
        <ActionForm
          action={createPoll}
          submitLabel={t('memberSpace.board.polls.create')}
          resetOnSuccess
          className="rounded-2xl border-2 p-6"
          testId="poll-form"
        >
          <TextField
            name="title"
            label={t('memberSpace.board.fields.title')}
            required
            maxLength={200}
            dir="auto"
          />
          <TextAreaField
            name="description"
            label={t('memberSpace.board.fields.description')}
            hint={t('memberSpace.board.fields.markdownHint')}
            rows={3}
            maxLength={5000}
            dir="auto"
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField
              name="audience"
              label={t('memberSpace.audience.label')}
              defaultValue="member"
              options={audiences.map((value) => ({
                value,
                label: t(`memberSpace.audience.${value}`),
              }))}
            />
            <TextField
              name="closesAt"
              type="datetime-local"
              label={t('memberSpace.board.polls.closesAt')}
              hint={t('memberSpace.board.polls.closesAtHint')}
            />
          </div>
          <fieldset className="flex flex-col gap-4" aria-describedby="poll-options-hint">
            <legend className="text-base font-bold">{t('memberSpace.board.polls.slots')}</legend>
            <p id="poll-options-hint" className="text-sm text-muted-foreground">
              {t('memberSpace.board.polls.slotsHint', { min: MIN_POLL_OPTIONS })}
            </p>
            <FieldErrorMessage name="options" />
            {rows.map((index) => (
              <fieldset key={index} className="grid gap-4 rounded-xl border p-4 sm:grid-cols-3">
                <legend className="px-1 text-sm font-semibold">
                  {t('memberSpace.board.polls.slot', { number: index + 1 })}
                </legend>
                <TextField
                  id={`options-${index}-startsAt`}
                  name={`options.${index}.startsAt`}
                  type="datetime-local"
                  label={t('memberSpace.board.fields.startsAt')}
                />
                <TextField
                  id={`options-${index}-endsAt`}
                  name={`options.${index}.endsAt`}
                  type="datetime-local"
                  label={t('memberSpace.board.fields.endsAt')}
                />
                <TextField
                  id={`options-${index}-label`}
                  name={`options.${index}.label`}
                  label={t('memberSpace.board.polls.slotLabel')}
                  maxLength={120}
                  dir="auto"
                />
              </fieldset>
            ))}
          </fieldset>
        </ActionForm>
      </AreaSection>

      <AreaSection id="all-polls" title={t('memberSpace.board.polls.all')}>
        {polls.length === 0 ? (
          <EmptyState>{t('memberSpace.board.polls.empty')}</EmptyState>
        ) : (
          <ul className="flex flex-col gap-4">
            {polls.map((poll) => (
              <li key={poll.id}>
                <article
                  aria-labelledby={`poll-${poll.id}`}
                  className="flex flex-col gap-3 rounded-2xl border-2 p-5"
                  data-testid="board-poll"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone={poll.open ? 'strong' : 'neutral'}>
                      {poll.open ? t('memberSpace.polls.openBadge') : t('memberSpace.polls.closed')}
                    </Pill>
                    {poll.audience === 'board' ? (
                      <Pill tone="strong">{t('memberSpace.audience.boardOnly')}</Pill>
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
                    <span>{t('memberSpace.polls.voters', { count: poll.voters })}</span>
                    {poll.closes_at ? (
                      <span>
                        {t(
                          poll.open ? 'memberSpace.polls.closesAt' : 'memberSpace.polls.closedAt',
                          {
                            date: formatDateTime(poll.closes_at, locale),
                          },
                        )}
                      </span>
                    ) : null}
                  </p>
                  <div className="flex flex-wrap gap-4 border-t pt-4">
                    {poll.open ? (
                      <ActionForm
                        action={closePoll}
                        hidden={{ pollId: poll.id }}
                        submitLabel={t('memberSpace.board.polls.close')}
                        submitVariant="outline"
                        confirmMessage={t('memberSpace.board.polls.closeConfirm')}
                      />
                    ) : null}
                    <ActionForm
                      action={deletePoll}
                      hidden={{ pollId: poll.id }}
                      submitLabel={t('memberSpace.board.delete')}
                      submitVariant="outline"
                      confirmMessage={t('memberSpace.board.polls.deleteConfirm')}
                    />
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </AreaSection>
    </AreaPage>
  );
}
