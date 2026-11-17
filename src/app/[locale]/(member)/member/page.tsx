import type * as React from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Pill } from '@/components/content/pill';
import { AreaPage } from '@/components/layout/area-page';
import { listAnnouncements } from '@/features/announcements/queries';
import { listMeetings } from '@/features/meetings/queries';
import { countUnreadNotifications } from '@/features/notifications/queries';
import { listPolls } from '@/features/polls/queries';
import { listMyActiveTasks } from '@/features/tasks/queries';
import { listUpcomingShifts } from '@/features/volunteering/queries';
import { Link } from '@/i18n/navigation';
import { requireRole } from '@/lib/auth/guards';
import { formatDateTime, formatDateTimeRange, formatShortDate } from '@/lib/content/format';
import { localizedText } from '@/lib/content/localized';
import { resolveLocaleParam } from '@/lib/i18n-params';
import { areaMetadata } from '@/lib/routes/area-metadata';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/member'>): Promise<Metadata> {
  return areaMetadata(await resolveLocaleParam(params), 'member', 'dashboard');
}

/** A dashboard block: a heading, a short list (or why it's empty), and a link to the full page. */
function Block({
  id,
  title,
  href,
  seeAll,
  empty,
  children,
}: {
  id: string;
  title: string;
  href: string;
  seeAll: string;
  empty: string | null;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4 rounded-2xl border-2 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={id} className="text-xl font-bold">
          {title}
        </h2>
        <Link href={href} className="text-sm font-semibold underline underline-offset-4">
          {seeAll}
        </Link>
      </div>
      {empty ? <p className="text-muted-foreground">{empty}</p> : children}
    </section>
  );
}

/** What needs the member's attention: meetings, their tasks, news from the board, polls, shifts. */
export default async function MemberDashboard({ params }: PageProps<'/[locale]/member'>) {
  const locale = await resolveLocaleParam(params);
  const user = await requireRole('member', { returnTo: '/member' });
  const t = await getTranslations({ locale });
  const [meetings, tasks, announcements, polls, shifts, unread] = await Promise.all([
    listMeetings(user.id, { limit: 3 }),
    listMyActiveTasks(user.id),
    listAnnouncements(3),
    listPolls(user.id),
    listUpcomingShifts(),
    countUnreadNotifications(user.id),
  ]);
  const openPolls = polls.filter((poll) => poll.open).slice(0, 3);
  const myShifts = shifts.filter((shift) => shift.signed_up).slice(0, 3);
  const seeAll = t('memberSpace.dashboard.seeAll');

  return (
    <AreaPage
      title={t('areas.member.sections.dashboard.title')}
      description={t('areas.member.sections.dashboard.description')}
      wide
    >
      <p className="flex flex-wrap items-center gap-3">
        <span data-testid="unread-count">
          {t('memberSpace.dashboard.unread', { count: unread })}
        </span>
        <Link href="/account/notifications" className="font-semibold underline underline-offset-4">
          {t('memberSpace.dashboard.seeNotifications')}
        </Link>
      </p>
      <div className="grid gap-6 lg:grid-cols-2">
        <Block
          id="dashboard-meetings"
          title={t('memberSpace.dashboard.meetings')}
          href="/member/meetings"
          seeAll={seeAll}
          empty={meetings.length === 0 ? t('memberSpace.meetings.empty') : null}
        >
          <ul className="flex flex-col gap-3">
            {meetings.map((meeting) => (
              <li key={meeting.id} className="flex flex-col gap-1">
                <Link
                  href={`/member/meetings/${meeting.id}`}
                  className="font-semibold underline-offset-4 hover:underline"
                  dir="auto"
                >
                  {meeting.title}
                </Link>
                <span className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <time dateTime={meeting.starts_at}>
                    {formatDateTimeRange(meeting.starts_at, meeting.ends_at, locale)}
                  </time>
                  {meeting.cancelled_at ? (
                    <Pill tone="danger">{t('memberSpace.meetings.cancelled')}</Pill>
                  ) : (
                    <Pill tone={meeting.myAnswer ? 'primary' : 'neutral'}>
                      {meeting.myAnswer
                        ? t(`memberSpace.meetings.myAnswer.${meeting.myAnswer}`)
                        : t('memberSpace.meetings.noAnswer')}
                    </Pill>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Block>

        <Block
          id="dashboard-tasks"
          title={t('memberSpace.dashboard.tasks')}
          href="/member/tasks"
          seeAll={seeAll}
          empty={tasks.length === 0 ? t('memberSpace.tasks.emptyMine') : null}
        >
          <ul className="flex flex-col gap-3">
            {tasks.map((task) => (
              <li key={task.id} className="flex flex-col gap-1">
                <Link
                  href={`/member/tasks/${task.id}`}
                  className="font-semibold underline-offset-4 hover:underline"
                  dir="auto"
                >
                  {task.title}
                </Link>
                <span className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <Pill tone="strong">{t(`memberSpace.tasks.status.${task.status}`)}</Pill>
                  {task.due_on ? (
                    <span>
                      {t('memberSpace.tasks.dueOn', { date: formatShortDate(task.due_on, locale) })}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </Block>

        <Block
          id="dashboard-announcements"
          title={t('memberSpace.dashboard.announcements')}
          href="/member/announcements"
          seeAll={seeAll}
          empty={announcements.length === 0 ? t('memberSpace.announcements.empty') : null}
        >
          <ul className="flex flex-col gap-3">
            {announcements.map((announcement) => (
              <li key={announcement.id} className="flex flex-col gap-1">
                <span className="font-semibold" dir="auto">
                  {announcement.title || t('memberSpace.announcements.untitled')}
                </span>
                <time
                  dateTime={announcement.published_at}
                  className="text-sm text-muted-foreground"
                >
                  {formatDateTime(announcement.published_at, locale)}
                </time>
              </li>
            ))}
          </ul>
        </Block>

        <Block
          id="dashboard-polls"
          title={t('memberSpace.dashboard.polls')}
          href="/member/polls"
          seeAll={seeAll}
          empty={openPolls.length === 0 ? t('memberSpace.polls.emptyOpen') : null}
        >
          <ul className="flex flex-col gap-3">
            {openPolls.map((poll) => (
              <li key={poll.id} className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/member/polls/${poll.id}`}
                  className="font-semibold underline-offset-4 hover:underline"
                  dir="auto"
                >
                  {poll.title}
                </Link>
                <Pill tone={poll.answered ? 'primary' : 'strong'}>
                  {poll.answered
                    ? t('memberSpace.polls.answered')
                    : t('memberSpace.polls.notAnswered')}
                </Pill>
              </li>
            ))}
          </ul>
        </Block>

        <Block
          id="dashboard-shifts"
          title={t('memberSpace.dashboard.shifts')}
          href="/member/volunteer"
          seeAll={seeAll}
          empty={myShifts.length === 0 ? t('memberSpace.dashboard.noShifts') : null}
        >
          <ul className="flex flex-col gap-3">
            {myShifts.map((shift) => (
              <li key={shift.shift_id} className="flex flex-col gap-1">
                <span className="font-semibold" dir="auto">
                  {localizedText(shift.role_label, locale)}
                  {shift.event ? (
                    <span className="font-normal text-muted-foreground">
                      {' '}
                      <bdi>{localizedText(shift.event.title, locale)}</bdi>
                    </span>
                  ) : null}
                </span>
                <time dateTime={shift.starts_at} className="text-sm text-muted-foreground">
                  {formatDateTimeRange(shift.starts_at, shift.ends_at, locale)}
                </time>
              </li>
            ))}
          </ul>
        </Block>
      </div>
    </AreaPage>
  );
}
