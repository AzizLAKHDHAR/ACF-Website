import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { CardGrid } from '@/components/content/card-grid';
import { EmptyState } from '@/components/content/empty-state';
import { PageHeader } from '@/components/content/page-header';
import { Pagination } from '@/components/content/pagination';
import { PostCard } from '@/components/content/post-card';
import { ProfileCard } from '@/components/content/profile-card';
import { listProfiles, PAGE_SIZE } from '@/features/catalogue/queries';
import { listLatestBlogPosts } from '@/features/posts/queries';
import { parseListParams } from '@/lib/content/params';
import { resolveLocaleParam } from '@/lib/i18n-params';
import { pageMetadata } from '@/lib/metadata';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/blogs'>): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const t = await getTranslations({ locale, namespace: 'pages.blogs' });
  return pageMetadata({ locale, path: '/blogs', title: t('title'), description: t('description') });
}

export default async function BlogsPage({ params, searchParams }: PageProps<'/[locale]/blogs'>) {
  const locale = await resolveLocaleParam(params);
  const { page } = parseListParams(await searchParams);
  const t = await getTranslations({ locale });
  const [{ items, total }, latest] = await Promise.all([
    listProfiles('blog', { page }),
    page === 1 ? listLatestBlogPosts(6) : Promise.resolve([]),
  ]);

  return (
    <>
      <PageHeader title={t('pages.blogs.title')} description={t('pages.blogs.description')} />
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-10 sm:px-6">
        {latest.length > 0 ? (
          <section aria-labelledby="latest-title" className="flex flex-col gap-4">
            <h2 id="latest-title" className="text-2xl font-extrabold">
              {t('content.post.latest')}
            </h2>
            <CardGrid>
              {latest.map((post) =>
                post.blog ? (
                  <li key={post.id}>
                    <PostCard
                      post={post}
                      href={`/blogs/${post.blog.slug}/${post.slug}`}
                      meta={post.blog.display_name}
                    />
                  </li>
                ) : null,
              )}
            </CardGrid>
          </section>
        ) : null}
        <section aria-labelledby="blogs-title" className="flex flex-col gap-4">
          <h2 id="blogs-title" className="text-2xl font-extrabold">
            {t('content.post.allBlogs')}
          </h2>
          {items.length > 0 ? (
            <CardGrid>
              {items.map((profile) => (
                <li key={profile.id}>
                  <ProfileCard profile={profile} />
                </li>
              ))}
            </CardGrid>
          ) : (
            <EmptyState>{t('content.empty.blogs')}</EmptyState>
          )}
          <Pagination pathname="/blogs" params={{ page }} total={total} pageSize={PAGE_SIZE} />
        </section>
      </div>
    </>
  );
}
