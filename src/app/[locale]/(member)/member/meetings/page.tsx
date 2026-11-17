import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/components/content/empty-state';
import { AreaPage, AreaSection } from '@/components/layout/area-page';
import { MeetingCard } from '@/features/meetings/components/meeting-card';
import { listMeetings } from '@/features/meetings/queries';
import { requireRole } from '@/lib/auth/guards';
import { resolveLocaleParam } from '@/lib/i18n-params';
import { areaMetadata } from '@/lib/routes/area-metadata';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/member/meetings'>): Promise<Metadata> {
  return areaMetadata(await resolveLocaleParam(params), 'member', 'meetings');
}

/** Meetings of the member's audience: what's coming (with their answer), then the recent past. */
export default async function MeetingsPage({ params }: PageProps<'/[locale]/member/meetings'>) {
  const locale = await resolveLocaleParam(params);
  const user = await requireRole('member', { returnTo: '/member/meetings' });
  const t = await getTranslations({ locale });
  const [upcoming, past] = await Promise.all([
    listMeetings(user.id),
    listMeetings(user.id, { when: 'past', limit: 20 }),
  ]);

  return (
    <AreaPage
      title={t('areas.member.sections.meetings.title')}
      description={t('areas.member.sections.meetings.description')}
    >
      <AreaSection id="upcoming-meetings" title={t('memberSpace.meetings.upcoming')}>
        {upcoming.length === 0 ? (
          <EmptyState>{t('memberSpace.meetings.empty')}</EmptyState>
        ) : (
          <ul className="flex flex-col gap-4">
            {upcoming.map((meeting) => (
              <li key={meeting.id}>
                <MeetingCard meeting={meeting} locale={locale} myAnswer={meeting.myAnswer} />
              </li>
            ))}
          </ul>
        )}
      </AreaSection>
      <AreaSection id="past-meetings" title={t('memberSpace.meetings.past')}>
        {past.length === 0 ? (
          <EmptyState>{t('memberSpace.meetings.emptyPast')}</EmptyState>
        ) : (
          <ul className="flex flex-col gap-4">
            {past.map((meeting) => (
              <li key={meeting.id}>
                <MeetingCard meeting={meeting} locale={locale} />
              </li>
            ))}
          </ul>
        )}
      </AreaSection>
    </AreaPage>
  );
}
