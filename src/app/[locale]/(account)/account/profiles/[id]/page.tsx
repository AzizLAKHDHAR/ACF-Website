import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import {
  listGovernorates,
  listTaxonomyOptions,
  sectionByProfileType,
} from '@/features/catalogue/queries';
import {
  DangerSection,
  DetailsSection,
  EditorSection,
  GeneralSection,
  ManagersSection,
  MediaSection,
  PrivateSection,
  StatusSection,
} from '@/features/profiles/components/editor-sections';
import {
  getEditableProfile,
  getManagerRole,
  listManagers,
  listReviewEvents,
} from '@/features/profiles/queries';
import { uuid } from '@/features/profiles/schemas';
import { Link } from '@/i18n/navigation';
import { requireUser } from '@/lib/auth/guards';
import { resolveLocaleParam } from '@/lib/i18n-params';
import { pageMetadata } from '@/lib/metadata';

type Props = PageProps<'/[locale]/account/profiles/[id]'>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const { id } = await params;
  const t = await getTranslations({ locale, namespace: 'profiles.editor' });
  return pageMetadata({
    locale,
    path: `/account/profiles/${id}`,
    title: t('title'),
    description: t('description'),
    noindex: true,
  });
}

/** The profile editor: only the profile's managers get here (admins review from /admin/approvals). */
export default async function ProfileEditorPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const user = await requireUser({ returnTo: `/account/profiles/${id}` });
  const role = await getManagerRole(id, user.id);
  if (!role) notFound();

  const [profile, history, managers, governorates, taxonomies] = await Promise.all([
    getEditableProfile(id),
    listReviewEvents('profile', id),
    listManagers(id),
    listGovernorates(),
    listTaxonomyOptions(),
  ]);
  if (!profile) notFound();
  const t = await getTranslations({ locale, namespace: 'profiles' });
  const approved = profile.status === 'approved';
  const canPropose = approved && (profile.type === 'artist' || profile.type === 'venue');
  const isBlog = profile.type === 'blog';

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12 sm:py-16">
      <header className="flex flex-col gap-3">
        <Link href="/account/profiles" className="w-fit text-sm underline underline-offset-4">
          {t('editor.back')}
        </Link>
        <p className="text-sm font-semibold text-muted-foreground">{t(`types.${profile.type}`)}</p>
        <h1 className="text-3xl font-extrabold tracking-tight" dir="auto">
          {profile.display_name}
        </h1>
        {approved ? (
          <Link
            href={`/${sectionByProfileType[profile.type]}/${profile.slug}`}
            className="w-fit text-sm font-semibold underline underline-offset-4"
          >
            {t('editor.viewPublic')}
          </Link>
        ) : null}
      </header>

      <StatusSection profile={profile} locale={locale} history={history} />

      {canPropose || isBlog ? (
        <EditorSection id="content" title={t('editor.sections.content')}>
          {isBlog ? (
            approved ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm">{t('content.postsHint')}</p>
                <Button asChild variant="outline" className="w-fit">
                  <Link href={`/account/profiles/${profile.id}/posts`}>{t('content.posts')}</Link>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('content.postsLocked')}</p>
            )
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-sm">{t('content.eventsHint')}</p>
              <Button asChild variant="outline" className="w-fit">
                <Link href={`/account/profiles/${profile.id}/events`}>{t('content.events')}</Link>
              </Button>
            </div>
          )}
        </EditorSection>
      ) : null}

      <GeneralSection profile={profile} locale={locale} governorates={governorates} />
      <DetailsSection
        profile={profile}
        locale={locale}
        genres={taxonomies.genres}
        professions={taxonomies.professions}
      />
      <MediaSection profile={profile} locale={locale} />
      <PrivateSection profile={profile} locale={locale} />
      <ManagersSection
        profileId={profile.id}
        locale={locale}
        managers={managers}
        currentUserId={user.id}
        isOwner={role === 'owner'}
      />
      {role === 'owner' && profile.status === 'draft' ? (
        <DangerSection profileId={profile.id} locale={locale} />
      ) : null}
    </div>
  );
}
