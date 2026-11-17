import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/components/content/empty-state';
import { ActionForm } from '@/components/forms/action-form';
import { SelectField, TextField } from '@/components/forms/fields';
import { createBlogPost } from '@/features/posts/actions';
import { listEditorPosts } from '@/features/posts/editor-queries';
import { getEditableProfile, getManagerRole } from '@/features/profiles/queries';
import { uuid } from '@/features/profiles/schemas';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { requireUser } from '@/lib/auth/guards';
import { formatShortDate } from '@/lib/content/format';
import { resolveLocaleParam } from '@/lib/i18n-params';
import { pageMetadata } from '@/lib/metadata';

type Props = PageProps<'/[locale]/account/profiles/[id]/posts'>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const { id } = await params;
  const t = await getTranslations({ locale, namespace: 'blogEditor' });
  return pageMetadata({
    locale,
    path: `/account/profiles/${id}/posts`,
    title: t('title'),
    description: t('description'),
    noindex: true,
  });
}

/** The posts of an approved blog, in every language and status, and a form for a new one. */
export default async function BlogPostsPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const user = await requireUser({ returnTo: `/account/profiles/${id}/posts` });
  if (!(await getManagerRole(id, user.id))) notFound();
  const profile = await getEditableProfile(id);
  if (!profile || profile.type !== 'blog' || profile.status !== 'approved') notFound();
  const posts = await listEditorPosts(id);
  const t = await getTranslations({ locale });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12 sm:py-16">
      <header className="flex flex-col gap-2">
        <Link
          href={`/account/profiles/${id}`}
          className="w-fit text-sm underline underline-offset-4"
        >
          {t('proposals.backToProfile')}
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight">{t('blogEditor.title')}</h1>
        <p className="text-muted-foreground" dir="auto">
          {profile.display_name}
        </p>
      </header>

      <section aria-labelledby="posts" className="flex flex-col gap-4">
        <h2 id="posts" className="text-xl font-bold">
          {t('blogEditor.listHeading')}
        </h2>
        {posts.length === 0 ? (
          <EmptyState>{t('blogEditor.empty')}</EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">
            {posts.map((post) => (
              <li
                key={post.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border-2 p-4"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <Link
                    href={`/account/profiles/${id}/posts/${post.id}`}
                    className="truncate font-bold underline-offset-4 hover:underline"
                    lang={post.locale}
                    dir="auto"
                  >
                    {post.title}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {t(`localeNames.${post.locale}`)}
                    {' · '}
                    {formatShortDate(post.updated_at, locale)}
                  </p>
                </div>
                <span className="rounded-full border-2 px-3 py-0.5 text-xs font-bold">
                  {t(`proposals.status.${post.status}`)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="new-post" className="flex flex-col gap-4 rounded-2xl border-2 p-6">
        <h2 id="new-post" className="text-xl font-bold">
          {t('blogEditor.new')}
        </h2>
        <ActionForm
          action={createBlogPost}
          hidden={{ profileId: id }}
          submitLabel={t('blogEditor.create')}
          testId="create-post"
        >
          <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
            <SelectField
              name="postLocale"
              label={t('blogEditor.fields.language')}
              defaultValue={locale}
              options={routing.locales.map((language) => ({
                value: language,
                label: t(`localeNames.${language}`),
              }))}
            />
            <TextField
              name="title"
              label={t('blogEditor.fields.title')}
              maxLength={200}
              required
              dir="auto"
            />
          </div>
        </ActionForm>
      </section>
    </div>
  );
}
