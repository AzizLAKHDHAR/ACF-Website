import type { Metadata } from 'next';
import { ArrowRightIcon } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import {
  CamoBackground,
  GenreStrip,
  JoinBanner,
  ValuesList,
} from '@/components/brand/brand-sections';
import { CardGrid } from '@/components/content/card-grid';
import { EventCard } from '@/components/content/event-card';
import { PostCard } from '@/components/content/post-card';
import { Button } from '@/components/ui/button';
import { publicHref, publicSections } from '@/config/navigation';
import { publicSectionIcons } from '@/config/icons';
import { listEvents } from '@/features/events/queries';
import { listNews } from '@/features/posts/queries';
import { Link } from '@/i18n/navigation';
import { resolveLocaleParam } from '@/lib/i18n-params';
import { pageMetadata } from '@/lib/metadata';

export async function generateMetadata({ params }: PageProps<'/[locale]'>): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const t = await getTranslations({ locale, namespace: 'metadata' });

  return {
    ...pageMetadata({ locale, path: '', description: t('description') }),
    title: { absolute: t('title') },
  };
}

export default async function HomePage({ params }: PageProps<'/[locale]'>) {
  const locale = await resolveLocaleParam(params);
  const t = await getTranslations({ locale });
  const [{ items: upcoming }, { items: news }] = await Promise.all([
    listEvents({ when: 'upcoming', limit: 3 }),
    listNews(locale, { limit: 3 }),
  ]);

  return (
    <>
      <section className="relative overflow-hidden border-b">
        <CamoBackground />
        <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:px-6 sm:py-24">
          <h1 className="max-w-3xl font-display text-4xl font-extrabold tracking-tight text-balance sm:text-6xl">
            {t('home.title')}
          </h1>
          <GenreStrip />
          <p className="max-w-2xl text-lg text-pretty">{t('home.intro')}</p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href={publicHref.artists}>
                {t('home.ctaArtists')}
                <ArrowRightIcon className="rtl:rotate-180" aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href={publicHref.about}>{t('home.ctaAbout')}</Link>
            </Button>
          </div>
        </div>
      </section>

      {upcoming.length > 0 || news.length > 0 ? (
        <div className="mx-auto flex max-w-6xl flex-col gap-14 px-4 py-16 sm:px-6">
          {upcoming.length > 0 ? (
            <section aria-labelledby="upcoming-title" className="flex flex-col gap-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <h2
                  id="upcoming-title"
                  className="text-2xl font-extrabold tracking-tight sm:text-3xl"
                >
                  {t('content.home.upcomingEvents')}
                </h2>
                <Link
                  href={publicHref.events}
                  className="inline-flex items-center gap-2 font-semibold underline underline-offset-4"
                >
                  {t('content.home.allEvents')}
                  <ArrowRightIcon className="size-4 rtl:rotate-180" aria-hidden />
                </Link>
              </div>
              <CardGrid>
                {upcoming.map((event) => (
                  <li key={event.id}>
                    <EventCard event={event} />
                  </li>
                ))}
              </CardGrid>
            </section>
          ) : null}
          {news.length > 0 ? (
            <section aria-labelledby="news-title" className="flex flex-col gap-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <h2 id="news-title" className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                  {t('content.home.latestNews')}
                </h2>
                <Link
                  href={publicHref.news}
                  className="inline-flex items-center gap-2 font-semibold underline underline-offset-4"
                >
                  {t('content.home.allNews')}
                  <ArrowRightIcon className="size-4 rtl:rotate-180" aria-hidden />
                </Link>
              </div>
              <CardGrid>
                {news.map((post) => (
                  <li key={post.id}>
                    <PostCard post={post} href={`/news/${post.slug}`} />
                  </li>
                ))}
              </CardGrid>
            </section>
          ) : null}
        </div>
      ) : null}

      <div className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <ValuesList />
        </div>
      </div>

      <section aria-labelledby="explore" className="border-t bg-muted">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 id="explore" className="mb-8 text-2xl font-extrabold tracking-tight sm:text-3xl">
            {t('home.sectionsTitle')}
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {publicSections.map((section) => {
              const Icon = publicSectionIcons[section];
              return (
                <li key={section}>
                  <Link
                    href={publicHref[section]}
                    className="group flex h-full flex-col gap-3 rounded-2xl border-2 border-transparent bg-card p-5 text-card-foreground transition-colors hover:border-primary-border hover:bg-accent hover:text-accent-foreground"
                  >
                    <span className="inline-flex size-10 items-center justify-center rounded-lg border-2 border-primary-border bg-brand text-brand-foreground">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span className="text-lg font-bold">{t(`pages.${section}.title`)}</span>
                    <span className="text-sm text-muted-foreground group-hover:text-accent-foreground">
                      {t(`pages.${section}.description`)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <JoinBanner>
          <Button asChild size="lg">
            <Link href="/signup">{t('pages.signup.title')}</Link>
          </Button>
        </JoinBanner>
      </div>
    </>
  );
}
