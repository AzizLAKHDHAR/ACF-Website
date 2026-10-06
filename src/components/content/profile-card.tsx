import { getLocale } from 'next-intl/server';
import type { ProfileCard as ProfileCardData } from '@/features/catalogue/queries';
import { sectionByProfileType } from '@/features/catalogue/queries';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { localizedText } from '@/lib/content/localized';
import { Avatar } from './avatar';
import { LocalizedText } from './localized-text';

export async function ProfileCard({ profile }: { profile: ProfileCardData }) {
  const locale = (await getLocale()) as Locale;
  const genres = profile.profile_genres.flatMap((entry) => (entry.genres ? [entry.genres] : []));
  return (
    <Link
      href={`/${sectionByProfileType[profile.type]}/${profile.slug}`}
      className="group flex h-full gap-4 rounded-2xl border-2 border-transparent bg-card p-4 text-card-foreground transition-colors hover:border-primary-border hover:bg-accent hover:text-accent-foreground"
    >
      <Avatar name={profile.display_name} path={profile.avatar_path} />
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-lg font-bold" dir="auto">
          {profile.display_name}
        </span>
        <LocalizedText
          value={profile.tagline}
          locale={locale}
          className="text-sm text-muted-foreground group-hover:text-accent-foreground"
        />
        {profile.city ? (
          <span
            className="text-sm text-muted-foreground group-hover:text-accent-foreground"
            dir="auto"
          >
            {profile.city}
          </span>
        ) : null}
        {genres.length > 0 ? (
          <span className="mt-1 flex flex-wrap gap-1">
            {genres.map((genre) => (
              <span
                key={genre.slug}
                className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground"
              >
                {localizedText(genre.name, locale)}
              </span>
            ))}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
