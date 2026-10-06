import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { CardGrid } from '@/components/content/card-grid';
import { EmptyState } from '@/components/content/empty-state';
import { PageHeader } from '@/components/content/page-header';
import { Pagination } from '@/components/content/pagination';
import { PostCard } from '@/components/content/post-card';
import { listNews, POSTS_PAGE_SIZE } from '@/features/posts/queries';
import { parseListParams } from '@/lib/content/params';
import { resolveLocaleParam } from '@/lib/i18n-params';
import { pageMetadata } from '@/lib/metadata';

export async function generateMetadata({ params }: PageProps<'/[locale]/news'>): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const t = await getTranslations({ locale, namespace: 'pages.news' });
  return pageMetadata({ locale, path: '/news', title: t('title'), description: t('description') });
}

export default async function NewsPage({ params, searchParams }: PageProps<'/[locale]/news'>) {
  const locale = await resolveLocaleParam(params);
  const { page } = parseListParams(await searchParams);
  const t = await getTranslations({ locale });
  const { items, total } = await listNews(locale, { page });

  return (
    <>
      <PageHeader title={t('pages.news.title')} description={t('pages.news.description')} />
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
        {items.length > 0 ? (
          <CardGrid label={t('pages.news.title')}>
            {items.map((post) => (
              <li key={post.id}>
                <PostCard post={post} href={`/news/${post.slug}`} />
              </li>
            ))}
          </CardGrid>
        ) : (
          <EmptyState>{t('content.empty.posts')}</EmptyState>
        )}
        <Pagination pathname="/news" params={{ page }} total={total} pageSize={POSTS_PAGE_SIZE} />
      </div>
    </>
  );
}
