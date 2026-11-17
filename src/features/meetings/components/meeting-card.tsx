import type * as React from 'react';
import { useTranslations } from 'next-intl';
import { Pill } from '@/components/content/pill';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { formatDateTimeRange } from '@/lib/content/format';
import type { RsvpResponse } from '../schemas';

export type MeetingSummary = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  location_text: string | null;
  online_url: string | null;
  audience: string;
  cancelled_at: string | null;
};

/** A meeting in a list: when, where, whether it's cancelled or board-only, and (optionally) your answer. */
export function MeetingCard({
  meeting,
  locale,
  myAnswer,
  heading: Heading = 'h3',
  children,
}: {
  meeting: MeetingSummary;
  locale: Locale;
  /** Leave undefined to hide the answer badge (e.g. on the board's list). */
  myAnswer?: RsvpResponse | null;
  heading?: 'h2' | 'h3';
  children?: React.ReactNode;
}) {
  const t = useTranslations('memberSpace');
  return (
    <article
      aria-labelledby={`meeting-${meeting.id}`}
      className="flex flex-col gap-3 rounded-2xl border-2 p-5"
      data-testid="meeting"
    >
      <div className="flex flex-wrap items-center gap-2">
        {meeting.cancelled_at ? <Pill tone="danger">{t('meetings.cancelled')}</Pill> : null}
        {meeting.audience === 'board' ? <Pill tone="strong">{t('audience.boardOnly')}</Pill> : null}
        {myAnswer !== undefined ? (
          <Pill tone={myAnswer ? 'primary' : 'neutral'} testId="my-answer">
            {myAnswer ? t(`meetings.myAnswer.${myAnswer}`) : t('meetings.noAnswer')}
          </Pill>
        ) : null}
      </div>
      <Heading id={`meeting-${meeting.id}`} className="text-lg font-bold" dir="auto">
        <Link
          href={`/member/meetings/${meeting.id}`}
          className="underline-offset-4 hover:underline"
        >
          {meeting.title}
        </Link>
      </Heading>
      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
        <time dateTime={meeting.starts_at}>
          {formatDateTimeRange(meeting.starts_at, meeting.ends_at, locale)}
        </time>
        {meeting.location_text ? <span dir="auto">{meeting.location_text}</span> : null}
        {meeting.online_url ? <span>{t('meetings.online')}</span> : null}
      </div>
      {children}
    </article>
  );
}
