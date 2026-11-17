import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/components/content/empty-state';
import { ActionForm } from '@/components/forms/action-form';
import { SelectField, TextAreaField, TextField } from '@/components/forms/fields';
import { AreaPage, AreaSection } from '@/components/layout/area-page';
import { cancelMeeting, createMeeting, deleteMeeting } from '@/features/meetings/actions';
import { MeetingCard } from '@/features/meetings/components/meeting-card';
import { listMeetings } from '@/features/meetings/queries';
import { requireRole } from '@/lib/auth/guards';
import { audiences } from '@/lib/forms/schemas';
import { resolveLocaleParam } from '@/lib/i18n-params';
import { areaMetadata } from '@/lib/routes/area-metadata';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/board/meetings'>): Promise<Metadata> {
  return areaMetadata(await resolveLocaleParam(params), 'board', 'meetings');
}

/** The board schedules meetings (members are notified), and cancels or deletes them. */
export default async function BoardMeetingsPage({ params }: PageProps<'/[locale]/board/meetings'>) {
  const locale = await resolveLocaleParam(params);
  const user = await requireRole('board', { returnTo: '/board/meetings' });
  const t = await getTranslations({ locale });
  const meetings = await listMeetings(user.id);

  return (
    <AreaPage
      title={t('areas.board.sections.meetings.title')}
      description={t('areas.board.sections.meetings.description')}
    >
      <AreaSection id="new-meeting" title={t('memberSpace.board.meetings.new')}>
        <ActionForm
          action={createMeeting}
          submitLabel={t('memberSpace.board.meetings.create')}
          resetOnSuccess
          className="rounded-2xl border-2 p-6"
          testId="meeting-form"
        >
          <TextField
            name="title"
            label={t('memberSpace.board.fields.title')}
            required
            maxLength={200}
            dir="auto"
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              name="startsAt"
              type="datetime-local"
              label={t('memberSpace.board.fields.startsAt')}
              hint={t('memberSpace.board.fields.tunisTime')}
              required
            />
            <TextField
              name="endsAt"
              type="datetime-local"
              label={t('memberSpace.board.fields.endsAt')}
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              name="location"
              label={t('memberSpace.board.fields.location')}
              maxLength={200}
              dir="auto"
            />
            <TextField
              name="onlineUrl"
              type="url"
              label={t('memberSpace.board.fields.onlineUrl')}
              maxLength={300}
              dir="ltr"
            />
          </div>
          <TextAreaField
            name="description"
            label={t('memberSpace.board.fields.agenda')}
            hint={t('memberSpace.board.fields.markdownHint')}
            rows={4}
            maxLength={5000}
            dir="auto"
          />
          <SelectField
            name="audience"
            label={t('memberSpace.audience.label')}
            hint={t('memberSpace.board.fields.audienceHint')}
            defaultValue="member"
            options={audiences.map((value) => ({
              value,
              label: t(`memberSpace.audience.${value}`),
            }))}
          />
        </ActionForm>
      </AreaSection>

      <AreaSection id="upcoming" title={t('memberSpace.meetings.upcoming')}>
        {meetings.length === 0 ? (
          <EmptyState>{t('memberSpace.meetings.empty')}</EmptyState>
        ) : (
          <ul className="flex flex-col gap-4">
            {meetings.map((meeting) => (
              <li key={meeting.id}>
                <MeetingCard meeting={meeting} locale={locale}>
                  <div className="flex flex-wrap gap-4 border-t pt-4">
                    {meeting.cancelled_at ? null : (
                      <ActionForm
                        action={cancelMeeting}
                        hidden={{ meetingId: meeting.id }}
                        submitLabel={t('memberSpace.board.meetings.cancel')}
                        submitVariant="outline"
                        confirmMessage={t('memberSpace.board.meetings.cancelConfirm')}
                      />
                    )}
                    <ActionForm
                      action={deleteMeeting}
                      hidden={{ meetingId: meeting.id }}
                      submitLabel={t('memberSpace.board.delete')}
                      submitVariant="outline"
                      confirmMessage={t('memberSpace.board.meetings.deleteConfirm')}
                    />
                  </div>
                </MeetingCard>
              </li>
            ))}
          </ul>
        )}
      </AreaSection>
    </AreaPage>
  );
}
