import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/components/content/empty-state';
import { ActionForm } from '@/components/forms/action-form';
import { CheckboxField, SelectField, TextAreaField, TextField } from '@/components/forms/fields';
import { listGovernorates } from '@/features/catalogue/queries';
import { proposeEvent } from '@/features/events/actions';
import { listProfileProposals } from '@/features/events/proposals';
import { getEditableProfile, getManagerRole } from '@/features/profiles/queries';
import { uuid } from '@/features/profiles/schemas';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { requireUser } from '@/lib/auth/guards';
import { formatDateTime } from '@/lib/content/format';
import { localizedText } from '@/lib/content/localized';
import { resolveLocaleParam } from '@/lib/i18n-params';
import { pageMetadata } from '@/lib/metadata';

type Props = PageProps<'/[locale]/account/profiles/[id]/events'>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const { id } = await params;
  const t = await getTranslations({ locale, namespace: 'proposals' });
  return pageMetadata({
    locale,
    path: `/account/profiles/${id}/events`,
    title: t('title'),
    description: t('description'),
    noindex: true,
  });
}

/** Event proposals for an approved artist or venue profile (roles.md §1 → Events: proposals). */
export default async function ProfileEventsPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const user = await requireUser({ returnTo: `/account/profiles/${id}/events` });
  if (!(await getManagerRole(id, user.id))) notFound();
  const profile = await getEditableProfile(id);
  if (
    !profile ||
    profile.status !== 'approved' ||
    (profile.type !== 'artist' && profile.type !== 'venue')
  )
    notFound();

  const [proposals, governorates] = await Promise.all([
    listProfileProposals(user.id, id),
    listGovernorates(),
  ]);
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
        <h1 className="text-3xl font-extrabold tracking-tight">{t('proposals.title')}</h1>
        <p className="text-muted-foreground">
          {profile.type === 'venue'
            ? t('proposals.introVenue', { name: profile.display_name })
            : t('proposals.introArtist', { name: profile.display_name })}
        </p>
      </header>

      <section aria-labelledby="mine" className="flex flex-col gap-4">
        <h2 id="mine" className="text-xl font-bold">
          {t('proposals.mine')}
        </h2>
        {proposals.length === 0 ? (
          <EmptyState>{t('proposals.empty')}</EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">
            {proposals.map((event) => (
              <li key={event.id} className="flex flex-col gap-2 rounded-2xl border-2 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-bold" dir="auto">
                    {localizedText(event.title, locale)}
                  </p>
                  <span className="rounded-full border-2 px-3 py-0.5 text-xs font-bold">
                    {t(`proposals.status.${event.status}`)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  <time dateTime={event.starts_at}>{formatDateTime(event.starts_at, locale)}</time>
                </p>
                {event.status === 'published' ? (
                  <Link
                    href={`/events/${event.slug}`}
                    className="w-fit text-sm font-semibold underline underline-offset-4"
                  >
                    {t('proposals.viewPublic')}
                  </Link>
                ) : null}
                {event.note && event.status === 'unpublished' ? (
                  <p className="rounded-xl border-2 border-destructive p-3 text-sm" dir="auto">
                    <span className="block font-semibold">{t('proposals.noteFromBoard')}</span>
                    {event.note}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="propose" className="flex flex-col gap-4 rounded-2xl border-2 p-6">
        <h2 id="propose" className="text-xl font-bold">
          {t('proposals.new')}
        </h2>
        <ActionForm
          action={proposeEvent}
          hidden={{ profileId: id }}
          submitLabel={t('proposals.submit')}
          resetOnSuccess
          testId="propose-event"
        >
          <fieldset className="flex flex-col gap-4">
            <legend className="mb-1 text-sm font-semibold">{t('proposals.fields.title')}</legend>
            <p className="text-sm text-muted-foreground">{t('proposals.fields.titleHint')}</p>
            {routing.locales.map((language) => (
              <TextField
                key={language}
                name={`title_${language}`}
                label={t(`localeNames.${language}`)}
                maxLength={160}
                lang={language}
                dir={language === 'ar' ? 'rtl' : 'ltr'}
              />
            ))}
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              name="startsAt"
              type="datetime-local"
              label={t('proposals.fields.startsAt')}
              hint={t('proposals.fields.timeHint')}
              required
            />
            <TextField name="endsAt" type="datetime-local" label={t('proposals.fields.endsAt')} />
          </div>
          {profile.type === 'artist' ? (
            <TextField
              name="venueText"
              label={t('proposals.fields.venue')}
              hint={t('proposals.fields.venueHint')}
              maxLength={200}
              dir="auto"
            />
          ) : null}
          <SelectField
            name="governorate"
            label={t('profiles.fields.governorate')}
            placeholder={t('profiles.fields.governoratePlaceholder')}
            defaultValue={profile.governorate_code ?? ''}
            options={governorates.map((g) => ({
              value: g.code,
              label: localizedText(g.name, locale),
            }))}
          />
          <fieldset className="flex flex-col gap-4">
            <legend className="mb-1 text-sm font-semibold">
              {t('proposals.fields.description')}
            </legend>
            {routing.locales.map((language) => (
              <TextAreaField
                key={language}
                name={`description_${language}`}
                label={t(`localeNames.${language}`)}
                maxLength={4000}
                rows={4}
                lang={language}
                dir={language === 'ar' ? 'rtl' : 'ltr'}
              />
            ))}
          </fieldset>
          <TextField
            name="ticketUrl"
            type="url"
            inputMode="url"
            dir="ltr"
            label={t('proposals.fields.ticketUrl')}
            maxLength={300}
          />
          <CheckboxField name="isFree" label={t('proposals.fields.isFree')} />
        </ActionForm>
      </section>
    </div>
  );
}
