import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ActionForm } from '@/components/forms/action-form';
import { SelectField, TextAreaField, TextField } from '@/components/forms/fields';
import { ImageUpload } from '@/components/forms/image-upload';
import {
  createBlogPost,
  deleteBlogPost,
  setBlogPostStatus,
  setPostCover,
  updateBlogPost,
} from '@/features/posts/actions';
import { getEditorPost } from '@/features/posts/editor-queries';
import { POST_BODY_MAX } from '@/features/posts/schemas';
import { EditorSection } from '@/features/profiles/components/editor-sections';
import { getEditableProfile, getManagerRole } from '@/features/profiles/queries';
import { uuid } from '@/features/profiles/schemas';
import { getDirection } from '@/i18n/locale';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { requireUser } from '@/lib/auth/guards';
import { publicMediaUrl } from '@/lib/content/media';
import { resolveLocaleParam } from '@/lib/i18n-params';
import { MAX_DIMENSION } from '@/lib/media/images';
import { pageMetadata } from '@/lib/metadata';

type Props = PageProps<'/[locale]/account/profiles/[id]/posts/[postId]'>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const { id, postId } = await params;
  const t = await getTranslations({ locale, namespace: 'blogEditor' });
  return pageMetadata({
    locale,
    path: `/account/profiles/${id}/posts/${postId}`,
    title: t('editTitle'),
    description: t('description'),
    noindex: true,
  });
}

/** Edit one blog post: text, cover, publication, translations. */
export default async function BlogPostEditorPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  const { id, postId } = await params;
  if (!uuid.safeParse(id).success || !uuid.safeParse(postId).success) notFound();
  const user = await requireUser({ returnTo: `/account/profiles/${id}/posts/${postId}` });
  if (!(await getManagerRole(id, user.id))) notFound();
  const [profile, post] = await Promise.all([getEditableProfile(id), getEditorPost(postId)]);
  if (!profile || profile.type !== 'blog' || profile.status !== 'approved') notFound();
  if (!post || post.blog_profile_id !== id) notFound();
  const t = await getTranslations({ locale });
  const missingLocales = routing.locales.filter(
    (language) =>
      language !== post.locale && !post.translations.some((other) => other.locale === language),
  );
  const published = post.status === 'published';

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12 sm:py-16">
      <header className="flex flex-col gap-2">
        <Link
          href={`/account/profiles/${id}/posts`}
          className="w-fit text-sm underline underline-offset-4"
        >
          {t('blogEditor.back')}
        </Link>
        <p className="text-sm font-semibold text-muted-foreground">
          {t('blogEditor.writtenIn', { language: t(`localeNames.${post.locale}`) })}
          {' · '}
          {t(`proposals.status.${post.status}`)}
        </p>
        <h1
          className="text-3xl font-extrabold tracking-tight"
          lang={post.locale}
          dir={getDirection(post.locale)}
        >
          {post.title}
        </h1>
        {published ? (
          <Link
            href={`/blogs/${profile.slug}/${post.slug}`}
            locale={post.locale}
            className="w-fit text-sm font-semibold underline underline-offset-4"
          >
            {t('blogEditor.viewPublic')}
          </Link>
        ) : null}
      </header>

      <EditorSection id="publication" title={t('blogEditor.publication')}>
        <p className="text-sm">
          {published ? t('blogEditor.publishedHint') : t('blogEditor.draftHint')}
        </p>
        <ActionForm
          action={setBlogPostStatus}
          hidden={{ postId: post.id, status: published ? 'unpublished' : 'published' }}
          submitLabel={published ? t('blogEditor.unpublish') : t('blogEditor.publish')}
          submitVariant={published ? 'outline' : 'default'}
          testId="post-status"
        />
      </EditorSection>

      <EditorSection id="text" title={t('blogEditor.text')}>
        <ActionForm
          action={updateBlogPost}
          hidden={{ postId: post.id }}
          submitLabel={t('profiles.save')}
          testId="post-text"
        >
          <TextField
            name="title"
            label={t('blogEditor.fields.title')}
            defaultValue={post.title}
            maxLength={200}
            required
            lang={post.locale}
            dir={getDirection(post.locale)}
          />
          <TextField
            name="slug"
            label={t('profiles.fields.slug')}
            hint={t('profiles.fields.slugHint')}
            defaultValue={post.slug}
            maxLength={120}
            required
            dir="ltr"
            autoCapitalize="off"
            spellCheck={false}
          />
          <TextAreaField
            name="excerpt"
            label={t('blogEditor.fields.excerpt')}
            defaultValue={post.excerpt ?? ''}
            maxLength={300}
            rows={2}
            lang={post.locale}
            dir={getDirection(post.locale)}
          />
          <TextAreaField
            name="body"
            label={t('blogEditor.fields.body')}
            hint={t('blogEditor.fields.bodyHint')}
            defaultValue={post.body_md}
            maxLength={POST_BODY_MAX}
            rows={16}
            lang={post.locale}
            dir={getDirection(post.locale)}
            className="font-mono"
          />
        </ActionForm>
      </EditorSection>

      <EditorSection id="cover" title={t('blogEditor.cover')}>
        <ImageUpload
          label={t('blogEditor.coverLabel')}
          hint={t('profiles.media.coverHint')}
          folder={`posts/${post.id}`}
          prefix="cover"
          maxDimension={MAX_DIMENSION.post}
          previewUrl={publicMediaUrl(post.cover_path)}
          previewClassName="aspect-video w-full rounded-2xl border-2 object-cover"
          onUploaded={setPostCover.bind(null, post.id)}
          onRemove={setPostCover.bind(null, post.id, '')}
        />
      </EditorSection>

      <EditorSection
        id="translations"
        title={t('blogEditor.translations')}
        description={t('blogEditor.translationsHint')}
      >
        {post.translations.length ? (
          <ul className="flex flex-col gap-2">
            {post.translations.map((other) => (
              <li key={other.id} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold">{t(`localeNames.${other.locale}`)}</span>
                <span aria-hidden>·</span>
                <Link
                  href={`/account/profiles/${id}/posts/${other.id}`}
                  className="underline underline-offset-4"
                  lang={other.locale}
                  dir="auto"
                >
                  {other.title}
                </Link>
                <span className="rounded-full border px-2 text-xs text-muted-foreground">
                  {t(`proposals.status.${other.status}`)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        {missingLocales.length ? (
          <ActionForm
            action={createBlogPost}
            hidden={{ profileId: id, translationOf: post.id }}
            submitLabel={t('blogEditor.addTranslation')}
            testId="add-translation"
          >
            <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
              <SelectField
                name="postLocale"
                label={t('blogEditor.fields.language')}
                options={missingLocales.map((language) => ({
                  value: language,
                  label: t(`localeNames.${language}`),
                }))}
              />
              <TextField
                id="translation-title"
                name="title"
                label={t('blogEditor.fields.translatedTitle')}
                maxLength={200}
                required
                dir="auto"
              />
            </div>
          </ActionForm>
        ) : null}
      </EditorSection>

      <EditorSection id="delete" title={t('blogEditor.deleteTitle')}>
        <ActionForm
          action={deleteBlogPost}
          hidden={{ postId: post.id, profileId: id }}
          submitLabel={t('blogEditor.delete')}
          submitVariant="destructive"
          confirmMessage={t('blogEditor.deleteConfirm')}
        />
      </EditorSection>
    </div>
  );
}
