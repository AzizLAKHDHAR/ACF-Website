import { getLocale } from 'next-intl/server';
import { getDirection } from '@/i18n/locale';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { formatShortDate } from '@/lib/content/format';

type CardPost = {
  title: string;
  excerpt: string | null;
  published_at: string | null;
  locale: Locale;
};

export async function PostCard({
  post,
  href,
  meta,
}: {
  post: CardPost;
  href: string;
  meta?: string;
}) {
  const locale = (await getLocale()) as Locale;
  const foreign = post.locale !== locale;
  return (
    <Link
      href={href}
      lang={foreign ? post.locale : undefined}
      dir={foreign ? getDirection(post.locale) : undefined}
      className="group flex h-full flex-col gap-2 rounded-2xl border-2 border-transparent bg-card p-5 text-card-foreground transition-colors hover:border-primary-border hover:bg-accent hover:text-accent-foreground"
    >
      {post.published_at ? (
        <time
          dateTime={post.published_at}
          className="text-sm text-muted-foreground group-hover:text-accent-foreground"
        >
          {formatShortDate(post.published_at, locale)}
          {meta ? ` · ${meta}` : ''}
        </time>
      ) : null}
      <span className="text-lg font-bold">{post.title}</span>
      {post.excerpt ? (
        <span className="text-sm text-muted-foreground group-hover:text-accent-foreground">
          {post.excerpt}
        </span>
      ) : null}
    </Link>
  );
}
