import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Avatar } from '@/components/content/avatar';
import { EmptyState } from '@/components/content/empty-state';
import { ActionForm } from '@/components/forms/action-form';
import { SelectField, TextField } from '@/components/forms/fields';
import { createProfile } from '@/features/profiles/actions';
import { StatusBadge } from '@/features/profiles/components/status-badge';
import { listMyProfiles } from '@/features/profiles/queries';
import { profileTypes } from '@/features/profiles/schemas';
import { Link } from '@/i18n/navigation';
import { requireUser } from '@/lib/auth/guards';
import { resolveLocaleParam } from '@/lib/i18n-params';
import { pageMetadata } from '@/lib/metadata';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/account/profiles'>): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const t = await getTranslations({ locale, namespace: 'profiles.list' });
  return pageMetadata({
    locale,
    path: '/account/profiles',
    title: t('title'),
    description: t('description'),
    noindex: true,
  });
}

export default async function MyProfilesPage({ params }: PageProps<'/[locale]/account/profiles'>) {
  const locale = await resolveLocaleParam(params);
  const user = await requireUser({ returnTo: '/account/profiles' });
  const t = await getTranslations({ locale, namespace: 'profiles' });
  const profiles = await listMyProfiles(user.id);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-12 sm:py-16">
      <header className="flex flex-col gap-2">
        <Link href="/account" className="w-fit text-sm underline underline-offset-4">
          {t('editor.backToAccount')}
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight">{t('list.title')}</h1>
        <p className="text-muted-foreground">{t('list.description')}</p>
      </header>

      <section aria-labelledby="my-profiles" className="flex flex-col gap-4">
        <h2 id="my-profiles" className="text-lg font-bold">
          {t('list.heading')}
        </h2>
        {profiles.length === 0 ? (
          <EmptyState>{t('list.empty')}</EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">
            {profiles.map((profile) => (
              <li
                key={profile.id}
                className="flex flex-wrap items-center gap-4 rounded-2xl border-2 p-4"
              >
                <Avatar name={profile.display_name} path={profile.avatar_path} />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <Link
                    href={`/account/profiles/${profile.id}`}
                    className="truncate text-lg font-bold underline-offset-4 hover:underline"
                  >
                    <bdi>{profile.display_name}</bdi>
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {t(`types.${profile.type}`)} · {t(`managers.roles.${profile.role}`)}
                  </p>
                </div>
                <StatusBadge status={profile.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        aria-labelledby="new-profile"
        className="flex flex-col gap-4 rounded-2xl border-2 p-6"
      >
        <h2 id="new-profile" className="text-lg font-bold">
          {t('create.title')}
        </h2>
        <p className="text-sm text-muted-foreground">{t('create.intro')}</p>
        <ActionForm action={createProfile} submitLabel={t('create.submit')} testId="create-profile">
          <SelectField
            name="type"
            label={t('create.type')}
            options={profileTypes.map((type) => ({ value: type, label: t(`types.${type}`) }))}
            required
          />
          <TextField
            name="displayName"
            label={t('fields.displayName')}
            hint={t('create.displayNameHint')}
            maxLength={120}
            required
            dir="auto"
          />
        </ActionForm>
      </section>
    </div>
  );
}
