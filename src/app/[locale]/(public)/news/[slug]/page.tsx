import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { JsonLd } from '@/components/content/json-ld';
import { Markdown } from '@/components/content/markdown';
import { PageHeader } from '@/components/content/page-header';
import { getNews } from '@/features/posts/queries';
import { Link } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { formatDate } from '@/lib/content/format';
import { publicMediaUrl } from '@/lib/content/media';
import { publicEnv } from '@/lib/env';
import { resolveLocaleParam } from '@/lib/i18n-params';
import { localizedPath, pageMetadata } from '@/lib/metadata';
import { articleJsonLd } from '@/lib/seo/json-ld';

export const revalidate = 300;
export function generateStaticParams() {
  return [];
}

async function load(params: PageProps<'/[locale]/news/[slug]'>['params']) {
  const locale = await resolveLocaleParam(params);
  const { slug } = await params;
  const post = await getNews(locale, slug);
  if (!post) notFound();
  // Each translation has its own slug, so hreflang points only at the versions that exist.
  const translations = post.translations.filter(
    (translation): translation is { locale: Locale; slug: string } =>
      translation.locale !== locale &&
      (routing.locales as readonly string[]).includes(translation.locale),
  );
  return { locale, post, translations };
}

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/news/[slug]'>): Promise<Metadata> {
  const { locale, post, translations } = await load(params);
  const metadata = pageMetadata({
    locale,
    path: `/news/${post.slug}`,
    title: post.title,
    description: post.excerpt ?? post.title,
  });
  const languages: Record<string, string> = {
    [locale]: localizedPath(locale, `/news/${post.slug}`),
  };
  for (const translation of translations)
    languages[translation.locale] = localizedPath(translation.locale, `/news/${translation.slug}`);
  const image = publicMediaUrl(post.cover_path);
  return {
    ...metadata,
    alternates: { canonical: localizedPath(locale, `/news/${post.slug}`), languages },
    openGraph: {
      ...metadata.openGraph,
      type: 'article',
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function NewsArticlePage({ params }: PageProps<'/[locale]/news/[slug]'>) {
  const { locale, post, translations } = await load(params);
  const t = await getTranslations({ locale });
  const site = publicEnv.NEXT_PUBLIC_SITE_URL;

  return (
    <>
      <JsonLd
        data={articleJsonLd({
          kind: 'news',
          headline: post.title,
          url: `${site}/${locale}/news/${post.slug}`,
          datePublished: post.published_at ?? post.updated_at,
          dateModified: post.updated_at,
          description: post.excerpt,
          image: publicMediaUrl(post.cover_path) ?? undefined,
          inLanguage: locale,
          authorName: t('metadata.siteName'),
          publisherName: t('metadata.siteName'),
          publisherUrl: `${site}/${locale}`,
        })}
      />
      <PageHeader
        eyebrow={
          <Link href="/news" className="underline underline-offset-4">
            {t('pages.news.title')}
          </Link>
        }
        title={post.title}
        description={post.excerpt ? <p>{post.excerpt}</p> : undefined}
      >
        {post.published_at ? (
          <time dateTime={post.published_at} className="font-semibold">
            {t('content.post.publishedOn', { date: formatDate(post.published_at, locale) })}
          </time>
        ) : null}
      </PageHeader>
      <article className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
        <Markdown>{post.body_md}</Markdown>
        {translations.length > 0 ? (
          <aside className="flex flex-wrap items-center gap-3 border-t pt-6">
            <h2 className="text-sm font-semibold text-muted-foreground">
              {t('content.post.otherLanguages')}
            </h2>
            <ul className="flex flex-wrap gap-2">
              {translations.map((translation) => (
                <li key={translation.locale}>
                  <Link
                    href={`/news/${translation.slug}`}
                    locale={translation.locale}
                    hrefLang={translation.locale}
                    lang={translation.locale}
                    className="inline-block rounded-full border-2 px-3 py-1 text-sm font-semibold hover:bg-accent hover:text-accent-foreground"
                  >
                    {t(`localeNames.${translation.locale}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        ) : null}
      </article>
    </>
  );
}
