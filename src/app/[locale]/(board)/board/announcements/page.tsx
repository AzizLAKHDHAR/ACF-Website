import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/components/content/empty-state';
import { ActionForm } from '@/components/forms/action-form';
import { CheckboxField, SelectField, TextAreaField, TextField } from '@/components/forms/fields';
import { AreaPage, AreaSection } from '@/components/layout/area-page';
import {
  createAnnouncement,
  deleteAnnouncement,
  setAnnouncementHidden,
  setAnnouncementPinned,
} from '@/features/announcements/actions';
import { AnnouncementCard } from '@/features/announcements/components/announcement-card';
import { listAllAnnouncements } from '@/features/announcements/queries';
import { requireRole } from '@/lib/auth/guards';
import { audiences } from '@/lib/forms/schemas';
import { resolveLocaleParam } from '@/lib/i18n-params';
import { areaMetadata } from '@/lib/routes/area-metadata';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/board/announcements'>): Promise<Metadata> {
  return areaMetadata(await resolveLocaleParam(params), 'board', 'announcements');
}

/** The board writes announcements (their audience is notified) and hides, pins or deletes them. */
export default async function BoardAnnouncementsPage({
  params,
}: PageProps<'/[locale]/board/announcements'>) {
  const locale = await resolveLocaleParam(params);
  await requireRole('board', { returnTo: '/board/announcements' });
  const t = await getTranslations({ locale });
  const announcements = await listAllAnnouncements();

  return (
    <AreaPage
      title={t('areas.board.sections.announcements.title')}
      description={t('areas.board.sections.announcements.description')}
    >
      <AreaSection
        id="new-announcement"
        title={t('memberSpace.board.announcements.new')}
        description={t('memberSpace.board.announcements.discordLater')}
      >
        <ActionForm
          action={createAnnouncement}
          submitLabel={t('memberSpace.board.announcements.publish')}
          resetOnSuccess
          className="rounded-2xl border-2 p-6"
          testId="announcement-form"
        >
          <TextField
            name="title"
            label={t('memberSpace.board.fields.title')}
            required
            maxLength={200}
            dir="auto"
          />
          <TextAreaField
            name="body"
            label={t('memberSpace.board.fields.message')}
            hint={t('memberSpace.board.fields.markdownHint')}
            rows={6}
            maxLength={10000}
            required
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
          <CheckboxField name="pinned" label={t('memberSpace.board.announcements.pin')} />
        </ActionForm>
      </AreaSection>

      <AreaSection id="all-announcements" title={t('memberSpace.board.announcements.all')}>
        {announcements.length === 0 ? (
          <EmptyState>{t('memberSpace.announcements.empty')}</EmptyState>
        ) : (
          <ul className="flex flex-col gap-6">
            {announcements.map((announcement) => (
              <li key={announcement.id}>
                <AnnouncementCard announcement={announcement} locale={locale} heading="h3">
                  <div className="flex flex-wrap gap-4 border-t pt-4">
                    <ActionForm
                      action={setAnnouncementHidden}
                      hidden={{
                        announcementId: announcement.id,
                        value: announcement.hidden_at ? 'false' : 'true',
                      }}
                      submitLabel={
                        announcement.hidden_at
                          ? t('memberSpace.board.announcements.show')
                          : t('memberSpace.board.announcements.hide')
                      }
                      submitVariant="outline"
                    />
                    <ActionForm
                      action={setAnnouncementPinned}
                      hidden={{
                        announcementId: announcement.id,
                        value: announcement.pinned ? 'false' : 'true',
                      }}
                      submitLabel={
                        announcement.pinned
                          ? t('memberSpace.board.announcements.unpin')
                          : t('memberSpace.board.announcements.pinAction')
                      }
                      submitVariant="outline"
                    />
                    <ActionForm
                      action={deleteAnnouncement}
                      hidden={{ announcementId: announcement.id }}
                      submitLabel={t('memberSpace.board.delete')}
                      submitVariant="outline"
                      confirmMessage={t('memberSpace.board.announcements.deleteConfirm')}
                    />
                  </div>
                </AnnouncementCard>
              </li>
            ))}
          </ul>
        )}
      </AreaSection>
    </AreaPage>
  );
}
