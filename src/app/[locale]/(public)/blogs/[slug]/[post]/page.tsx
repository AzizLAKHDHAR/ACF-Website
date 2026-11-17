import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { JsonLd } from '@/components/content/json-ld';
import { Markdown } from '@/components/content/markdown';
import { PageHeader } from '@/components/content/page-header';
import { getProfile } from '@/features/catalogue/queries';
import { getBlogPost } from '@/features/posts/queries';
import { getDirection } from '@/i18n/locale';
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

async function load(params: PageProps<'/[locale]/blogs/[slug]/[post]'>['params']) {
  const locale = await resolveLocaleParam(params);
  const { slug, post: postSlug } = await params;
  const blog = await getProfile('blog', slug);
  if (!blog) notFound();
  const post = await getBlogPost(blog.id, postSlug, locale);
  if (!post) notFound();
  const translations = post.translations.filter(
    (translation): translation is { locale: Locale; slug: string } =>
      translation.locale !== post.locale &&
      (routing.locales as readonly string[]).includes(translation.locale),
  );
  return { locale, blog, post, translations };
}

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/blogs/[slug]/[post]'>): Promise<Metadata> {
  const { locale, blog, post, translations } = await load(params);
  const metadata = pageMetadata({
    locale,
    path: `/blogs/${blog.slug}/${post.slug}`,
    title: post.title,
    description: post.excerpt ?? `${post.title} · ${blog.display_name}`,
  });
  const image = publicMediaUrl(post.cover_path);
  // Each translation lives at its own slug under its own locale; the post itself under its locale.
  const alternates =
    translations.length > 0
      ? {
          ...metadata.alternates,
          languages: Object.fromEntries([
            [post.locale, localizedPath(post.locale, `/blogs/${blog.slug}/${post.slug}`)],
            ...translations.map((translation) => [
              translation.locale,
              localizedPath(translation.locale, `/blogs/${blog.slug}/${translation.slug}`),
            ]),
          ]),
        }
      : metadata.alternates;
  return {
    ...metadata,
    alternates,
    openGraph: {
      ...metadata.openGraph,
      type: 'article',
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function BlogPostPage({ params }: PageProps<'/[locale]/blogs/[slug]/[post]'>) {
  const { locale, blog, post, translations } = await load(params);
  const t = await getTranslations({ locale });
  const site = publicEnv.NEXT_PUBLIC_SITE_URL;
  // A blog post is written in one language; the interface stays in the visitor's locale.
  const foreign = post.locale !== locale;
  const lang = foreign ? { lang: post.locale, dir: getDirection(post.locale) } : {};

  return (
    <>
      <JsonLd
        data={articleJsonLd({
          kind: 'blog',
          headline: post.title,
          url: `${site}/${locale}/blogs/${blog.slug}/${post.slug}`,
          datePublished: post.published_at ?? post.updated_at,
          dateModified: post.updated_at,
          description: post.excerpt,
          image: publicMediaUrl(post.cover_path) ?? undefined,
          inLanguage: post.locale,
          authorName: blog.display_name,
          publisherName: t('metadata.siteName'),
          publisherUrl: `${site}/${locale}`,
        })}
      />
      <PageHeader
        eyebrow={
          <Link href={`/blogs/${blog.slug}`} className="underline underline-offset-4" dir="auto">
            {blog.display_name}
          </Link>
        }
        title={<span {...lang}>{post.title}</span>}
        description={post.excerpt ? <p {...lang}>{post.excerpt}</p> : undefined}
      >
        {post.published_at ? (
          <time dateTime={post.published_at} className="font-semibold">
            {t('content.post.publishedOn', { date: formatDate(post.published_at, locale) })}
          </time>
        ) : null}
      </PageHeader>
      <article className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6" {...lang}>
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
                    href={`/blogs/${blog.slug}/${translation.slug}`}
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
