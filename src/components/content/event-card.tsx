import { getLocale } from 'next-intl/server';
import type { EventCard as EventCardData } from '@/features/events/queries';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { formatDateTime } from '@/lib/content/format';
import { LocalizedText } from './localized-text';

type CardEvent = Pick<EventCardData, 'slug' | 'title' | 'starts_at' | 'venue_text'> & {
  venue?: { display_name: string } | null;
};

export async function EventCard({ event }: { event: CardEvent }) {
  const locale = (await getLocale()) as Locale;
  const place = event.venue?.display_name ?? event.venue_text;
  return (
    <Link
      href={`/events/${event.slug}`}
      className="group flex h-full flex-col gap-2 rounded-2xl border-2 border-transparent bg-card p-4 text-card-foreground transition-colors hover:border-primary-border hover:bg-accent hover:text-accent-foreground"
    >
      <time
        dateTime={event.starts_at}
        className="text-sm font-semibold text-muted-foreground group-hover:text-accent-foreground"
      >
        {formatDateTime(event.starts_at, locale)}
      </time>
      <LocalizedText value={event.title} locale={locale} className="text-lg font-bold" />
      {place ? (
        <span
          className="text-sm text-muted-foreground group-hover:text-accent-foreground"
          dir="auto"
        >
          {place}
        </span>
      ) : null}
    </Link>
  );
}
