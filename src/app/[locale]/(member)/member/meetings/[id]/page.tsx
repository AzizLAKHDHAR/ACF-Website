import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/components/content/empty-state';
import { Markdown } from '@/components/content/markdown';
import { Pill } from '@/components/content/pill';
import { ActionForm } from '@/components/forms/action-form';
import { RadioGroupField, TextAreaField } from '@/components/forms/fields';
import { AreaPage, AreaSection } from '@/components/layout/area-page';
import { answerMeeting } from '@/features/meetings/actions';
import { getMeeting, getMeetingAnswers } from '@/features/meetings/queries';
import { rsvpResponses } from '@/features/meetings/schemas';
import { isMeetingOpen } from '@/features/meetings/status';
import { getSessionRole, requireRole } from '@/lib/auth/guards';
import { hasRoleAtLeast } from '@/lib/auth/roles';
import { isSafeExternalUrl } from '@/lib/content/embeds';
import { formatDateTime, formatDateTimeRange, formatNumber } from '@/lib/content/format';
import { id as idSchema } from '@/lib/forms/schemas';
import { resolveLocaleParam } from '@/lib/i18n-params';
import { areaMetadata } from '@/lib/routes/area-metadata';

type Props = PageProps<'/[locale]/member/meetings/[id]'>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const { id } = await params;
  const meeting = idSchema.safeParse(id).success ? await getMeeting(id) : null;
  return areaMetadata(locale, 'member', 'meetings', {
    title: meeting?.title,
    path: `/member/meetings/${id}`,
  });
}

/** One meeting: details, the member's answer, the counts, and the attendance list for the board. */
export default async function MeetingPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  const { id } = await params;
  const user = await requireRole('member', { returnTo: '/member/meetings' });
  if (!idSchema.safeParse(id).success) notFound();
  const meeting = await getMeeting(id);
  if (!meeting) notFound();
  const t = await getTranslations({ locale });
  const isBoard = hasRoleAtLeast(await getSessionRole(), 'board');
  const { mine, counts, attendance } = await getMeetingAnswers(id, user.id, isBoard);
  const open = isMeetingOpen(meeting);
  const answerLabel = (response: (typeof rsvpResponses)[number]) =>
    t(`memberSpace.meetings.answers.${response}`);

  return (
    <AreaPage
      title={meeting.title}
      titleDir="auto"
      back={{ href: '/member/meetings', label: t('memberSpace.meetings.back') }}
      description={
        <div className="flex flex-wrap items-center gap-2">
          {meeting.cancelled_at ? (
            <Pill tone="danger">{t('memberSpace.meetings.cancelled')}</Pill>
          ) : null}
          {meeting.audience === 'board' ? (
            <Pill tone="strong">{t('memberSpace.audience.boardOnly')}</Pill>
          ) : null}
        </div>
      }
    >
      <dl className="grid gap-4 rounded-2xl border-2 p-6 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <dt className="text-sm text-muted-foreground">{t('memberSpace.meetings.when')}</dt>
          <dd className="font-semibold">
            <time dateTime={meeting.starts_at}>
              {formatDateTimeRange(meeting.starts_at, meeting.ends_at, locale)}
            </time>
          </dd>
        </div>
        {meeting.location_text ? (
          <div className="flex flex-col gap-1">
            <dt className="text-sm text-muted-foreground">{t('memberSpace.meetings.location')}</dt>
            <dd className="font-semibold" dir="auto">
              {meeting.location_text}
            </dd>
          </div>
        ) : null}
        {meeting.online_url && isSafeExternalUrl(meeting.online_url) ? (
          <div className="flex flex-col gap-1">
            <dt className="text-sm text-muted-foreground">{t('memberSpace.meetings.online')}</dt>
            <dd>
              <a
                href={meeting.online_url}
                rel="nofollow ugc noopener noreferrer"
                target="_blank"
                className="font-semibold break-all underline underline-offset-4"
                dir="ltr"
              >
                {t('memberSpace.meetings.join')}
              </a>
            </dd>
          </div>
        ) : null}
      </dl>

      {meeting.description_md ? (
        <AreaSection id="agenda" title={t('memberSpace.meetings.agenda')}>
          <Markdown>{meeting.description_md}</Markdown>
        </AreaSection>
      ) : null}

      <AreaSection id="your-answer" title={t('memberSpace.meetings.yourAnswer')}>
        {open ? (
          <ActionForm
            action={answerMeeting}
            hidden={{ meetingId: meeting.id }}
            submitLabel={t('memberSpace.meetings.save')}
            className="rounded-2xl border-2 p-6"
            testId="rsvp-form"
          >
            <RadioGroupField
              name="answer"
              legend={t('memberSpace.meetings.answerLegend')}
              options={rsvpResponses.map((response) => ({
                value: response,
                label: answerLabel(response),
              }))}
              defaultValue={mine?.response}
            />
            <TextAreaField
              name="note"
              label={t('memberSpace.meetings.note')}
              hint={t('memberSpace.meetings.noteHint')}
              defaultValue={mine?.note ?? ''}
              rows={2}
              maxLength={500}
              dir="auto"
            />
          </ActionForm>
        ) : (
          <p className="rounded-2xl border-2 border-dashed p-6 text-muted-foreground">
            {mine
              ? t('memberSpace.meetings.closedWithAnswer', { answer: answerLabel(mine.response) })
              : t('memberSpace.meetings.closed')}
          </p>
        )}
      </AreaSection>

      <AreaSection id="answers" title={t('memberSpace.meetings.counts')}>
        <dl className="grid grid-cols-3 gap-4" data-testid="rsvp-counts">
          {rsvpResponses.map((response) => (
            <div
              key={response}
              className="flex flex-col gap-1 rounded-2xl border-2 p-4 text-center"
            >
              <dt className="text-sm text-muted-foreground">{answerLabel(response)}</dt>
              <dd className="text-2xl font-extrabold" data-testid={`rsvp-count-${response}`}>
                {formatNumber(counts[response], locale)}
              </dd>
            </div>
          ))}
        </dl>
      </AreaSection>

      {isBoard ? (
        <AreaSection
          id="attendance"
          title={t('memberSpace.meetings.attendance')}
          description={t('memberSpace.meetings.attendanceHint')}
        >
          {attendance.length === 0 ? (
            <EmptyState>{t('memberSpace.meetings.attendanceEmpty')}</EmptyState>
          ) : (
            <div className="overflow-x-auto rounded-2xl border-2">
              <table className="w-full text-sm" data-testid="attendance">
                <thead className="bg-muted text-start">
                  <tr>
                    <th scope="col" className="p-3 text-start">
                      {t('memberSpace.meetings.name')}
                    </th>
                    <th scope="col" className="p-3 text-start">
                      {t('memberSpace.meetings.response')}
                    </th>
                    <th scope="col" className="p-3 text-start">
                      {t('memberSpace.meetings.noteColumn')}
                    </th>
                    <th scope="col" className="p-3 text-start">
                      {t('memberSpace.meetings.answeredAt')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((row) => (
                    <tr key={row.user_id} className="border-t">
                      <th scope="row" className="p-3 text-start font-semibold">
                        <bdi>{row.account?.display_name ?? '—'}</bdi>
                      </th>
                      <td className="p-3">{answerLabel(row.response)}</td>
                      <td className="p-3" dir="auto">
                        {row.note ?? ''}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        <time dateTime={row.updated_at}>
                          {formatDateTime(row.updated_at, locale)}
                        </time>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AreaSection>
      ) : null}
    </AreaPage>
  );
}
