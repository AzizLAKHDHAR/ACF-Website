import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/components/content/empty-state';
import { AreaPage } from '@/components/layout/area-page';
import { AnnouncementCard } from '@/features/announcements/components/announcement-card';
import { listAnnouncements } from '@/features/announcements/queries';
import { requireRole } from '@/lib/auth/guards';
import { resolveLocaleParam } from '@/lib/i18n-params';
import { areaMetadata } from '@/lib/routes/area-metadata';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/member/announcements'>): Promise<Metadata> {
  return areaMetadata(await resolveLocaleParam(params), 'member', 'announcements');
}

/** The board's announcements for the member's audience, pinned ones first. */
export default async function AnnouncementsPage({
  params,
}: PageProps<'/[locale]/member/announcements'>) {
  const locale = await resolveLocaleParam(params);
  await requireRole('member', { returnTo: '/member/announcements' });
  const t = await getTranslations({ locale });
  const announcements = await listAnnouncements();

  return (
    <AreaPage
      title={t('areas.member.sections.announcements.title')}
      description={t('areas.member.sections.announcements.description')}
    >
      {announcements.length === 0 ? (
        <EmptyState>{t('memberSpace.announcements.empty')}</EmptyState>
      ) : (
        <ul className="flex flex-col gap-6">
          {announcements.map((announcement) => (
            <li key={announcement.id}>
              <AnnouncementCard announcement={announcement} locale={locale} />
            </li>
          ))}
        </ul>
      )}
    </AreaPage>
  );
}
