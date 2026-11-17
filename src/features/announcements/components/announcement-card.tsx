import type * as React from 'react';
import { useTranslations } from 'next-intl';
import { Markdown } from '@/components/content/markdown';
import { Pill } from '@/components/content/pill';
import type { Locale } from '@/i18n/routing';
import { formatDateTime } from '@/lib/content/format';

export type AnnouncementView = {
  id: string;
  title: string | null;
  body_md: string;
  source: string;
  audience: string;
  author_display: string | null;
  pinned: boolean;
  published_at: string;
  edited_at: string | null;
  hidden_at: string | null;
  author: { display_name: string } | null;
};

/** One announcement: title, who posted it and when, and its Markdown body (rendered safely). */
export function AnnouncementCard({
  announcement,
  locale,
  heading: Heading = 'h2',
  children,
}: {
  announcement: AnnouncementView;
  locale: Locale;
  heading?: 'h2' | 'h3';
  children?: React.ReactNode;
}) {
  const t = useTranslations('memberSpace');
  const author = announcement.author?.display_name ?? announcement.author_display;
  return (
    <article
      aria-labelledby={`announcement-${announcement.id}`}
      className="flex flex-col gap-3 rounded-2xl border-2 p-6"
      data-testid="announcement"
    >
      <div className="flex flex-wrap items-center gap-2">
        {announcement.pinned ? <Pill tone="primary">{t('announcements.pinned')}</Pill> : null}
        {announcement.audience === 'board' ? (
          <Pill tone="strong">{t('audience.boardOnly')}</Pill>
        ) : null}
        {announcement.source === 'discord' ? <Pill>{t('announcements.fromDiscord')}</Pill> : null}
        {announcement.hidden_at ? (
          <Pill tone="danger">{t('announcements.hiddenBadge')}</Pill>
        ) : null}
      </div>
      <Heading id={`announcement-${announcement.id}`} className="text-xl font-bold" dir="auto">
        {announcement.title || t('announcements.untitled')}
      </Heading>
      <p className="flex flex-wrap gap-x-3 text-sm text-muted-foreground">
        {author ? (
          <span>
            <bdi>{author}</bdi>
          </span>
        ) : null}
        <time dateTime={announcement.published_at}>
          {formatDateTime(announcement.published_at, locale)}
        </time>
      </p>
      <Markdown>{announcement.body_md}</Markdown>
      {children}
    </article>
  );
}
