import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Avatar } from '@/components/content/avatar';
import { CardGrid } from '@/components/content/card-grid';
import { EmptyState } from '@/components/content/empty-state';
import { JsonLd } from '@/components/content/json-ld';
import { LocalizedText } from '@/components/content/localized-text';
import { PageHeader } from '@/components/content/page-header';
import { PostCard } from '@/components/content/post-card';
import { getProfile } from '@/features/catalogue/queries';
import { listBlogPosts } from '@/features/posts/queries';
import { Link } from '@/i18n/navigation';
import { localizedText } from '@/lib/content/localized';
import { publicMediaUrl } from '@/lib/content/media';
import { publicEnv } from '@/lib/env';
import { resolveLocaleParam } from '@/lib/i18n-params';
import { pageMetadata } from '@/lib/metadata';
import { profileJsonLd } from '@/lib/seo/json-ld';

export const revalidate = 300;
export function generateStaticParams() {
  return [];
}

async function load(params: PageProps<'/[locale]/blogs/[slug]'>['params']) {
  const locale = await resolveLocaleParam(params);
  const { slug } = await params;
  const blog = await getProfile('blog', slug);
  if (!blog) notFound();
  return { locale, blog };
}

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/blogs/[slug]'>): Promise<Metadata> {
  const { locale, blog } = await load(params);
  const image = publicMediaUrl(blog.cover_path ?? blog.avatar_path);
  const metadata = pageMetadata({
    locale,
    path: `/blogs/${blog.slug}`,
    title: blog.display_name,
    description: localizedText(blog.tagline, locale) || blog.display_name,
  });
  return image ? { ...metadata, openGraph: { ...metadata.openGraph, images: [image] } } : metadata;
}

export default async function BlogPage({ params }: PageProps<'/[locale]/blogs/[slug]'>) {
  const { locale, blog } = await load(params);
  const t = await getTranslations({ locale });
  const posts = await listBlogPosts(blog.id);

  return (
    <>
      <JsonLd
        data={profileJsonLd({
          type: 'blog',
          name: blog.display_name,
          url: `${publicEnv.NEXT_PUBLIC_SITE_URL}/${locale}/blogs/${blog.slug}`,
          description: localizedText(blog.tagline, locale) || undefined,
          image: publicMediaUrl(blog.avatar_path) ?? undefined,
        })}
      />
      <PageHeader
        eyebrow={
          <Link href="/blogs" className="underline underline-offset-4">
            {t('pages.blogs.title')}
          </Link>
        }
        title={blog.display_name}
        titleDir="auto"
        description={<LocalizedText value={blog.tagline} locale={locale} as="p" />}
      >
        <Avatar name={blog.display_name} path={blog.avatar_path} className="size-20 text-2xl" />
      </PageHeader>
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6">
        <LocalizedText
          value={blog.bio}
          locale={locale}
          as="p"
          className="max-w-3xl text-lg leading-relaxed whitespace-pre-line"
        />
        <section aria-labelledby="posts-title" className="flex flex-col gap-4">
          <h2 id="posts-title" className="text-2xl font-extrabold">
            {t('content.profile.posts')}
          </h2>
          {posts.length > 0 ? (
            <CardGrid>
              {posts.map((post) => (
                <li key={post.id}>
                  <PostCard post={post} href={`/blogs/${blog.slug}/${post.slug}`} />
                </li>
              ))}
            </CardGrid>
          ) : (
            <EmptyState>{t('content.empty.posts')}</EmptyState>
          )}
        </section>
      </div>
    </>
  );
}
