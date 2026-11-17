import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Avatar } from '@/components/content/avatar';
import { ActionForm } from '@/components/forms/action-form';
import { SelectField, TextAreaField } from '@/components/forms/fields';
import { listGovernorates, sectionByProfileType } from '@/features/catalogue/queries';
import { StatusBadge } from '@/features/profiles/components/status-badge';
import { getEditableProfile, listManagers } from '@/features/profiles/queries';
import { uuid } from '@/features/profiles/schemas';
import { reviewProfile } from '@/features/review/actions';
import { listReviewHistoryWithNotes } from '@/features/review/queries';
import { decisionsFor } from '@/features/review/schemas';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { requireRole } from '@/lib/auth/guards';
import { formatShortDate } from '@/lib/content/format';
import { localizedText } from '@/lib/content/localized';
import { publicMediaUrl } from '@/lib/content/media';
import { resolveLocaleParam } from '@/lib/i18n-params';
import { localizedPath } from '@/lib/metadata';
import type { Json } from '@/types/database';

type Props = PageProps<'/[locale]/admin/approvals/[id]'>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const { id } = await params;
  const t = await getTranslations({ locale, namespace: 'review' });
  return {
    title: t('detailTitle'),
    alternates: { canonical: localizedPath(locale, `/admin/approvals/${id}`) },
  };
}

function localeEntries(map: Json): { locale: string; text: string }[] {
  if (!map || typeof map !== 'object' || Array.isArray(map)) return [];
  return routing.locales.flatMap((locale) => {
    const value = map[locale];
    return typeof value === 'string' && value.trim() ? [{ locale, text: value }] : [];
  });
}

function linkUrls(links: Json): string[] {
  if (!Array.isArray(links)) return [];
  return links.flatMap((link) =>
    link && typeof link === 'object' && !Array.isArray(link) && typeof link.url === 'string'
      ? [link.url]
      : [],
  );
}

/** Everything the admin needs to decide on one profile, and the decision form. */
export default async function ReviewProfilePage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  await requireRole('admin', { returnTo: `/admin/approvals/${id}` });

  const [profile, history, managers, governorates] = await Promise.all([
    getEditableProfile(id),
    listReviewHistoryWithNotes(id),
    listManagers(id),
    listGovernorates(),
  ]);
  if (!profile) notFound();
  const t = await getTranslations({ locale });
  const decisions = decisionsFor(profile.status);
  const governorate = governorates.find((g) => g.code === profile.governorate_code);
  const cover = publicMediaUrl(profile.cover_path);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-10 sm:px-6">
      <Link href="/admin/approvals" className="w-fit text-sm underline underline-offset-4">
        {t('review.back')}
      </Link>
      <header className="flex flex-wrap items-center gap-4">
        <Avatar name={profile.display_name} path={profile.avatar_path} className="size-20" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-sm font-semibold text-muted-foreground">
            {t(`profiles.types.${profile.type}`)}
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight" dir="auto">
            {profile.display_name}
          </h1>
          <p className="text-sm text-muted-foreground" dir="ltr">
            {`/${sectionByProfileType[profile.type]}/${profile.slug}`}
          </p>
        </div>
        <StatusBadge status={profile.status} />
      </header>

      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt="" className="aspect-[3/1] w-full rounded-2xl border-2 object-cover" />
      ) : null}

      <section aria-labelledby="content" className="flex flex-col gap-4 rounded-2xl border-2 p-6">
        <h2 id="content" className="text-xl font-bold">
          {t('review.contentHeading')}
        </h2>
        <dl className="grid gap-4">
          <div className="flex flex-col gap-1">
            <dt className="text-sm font-semibold">{t('profiles.fields.tagline')}</dt>
            {localeEntries(profile.tagline).map((entry) => (
              <dd key={entry.locale} lang={entry.locale} dir="auto">
                {entry.text}
              </dd>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-sm font-semibold">{t('profiles.fields.bio')}</dt>
            {localeEntries(profile.bio).map((entry) => (
              <dd key={entry.locale} lang={entry.locale} dir="auto" className="whitespace-pre-line">
                {entry.text}
              </dd>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-sm font-semibold">{t('content.profile.location')}</dt>
            <dd dir="auto">
              {[profile.city, governorate ? localizedText(governorate.name, locale) : null]
                .filter(Boolean)
                .join(' · ') || '—'}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-sm font-semibold">{t('content.profile.links')}</dt>
            {linkUrls(profile.links).map((url) => (
              <dd key={url} dir="ltr" className="break-all">
                <a
                  href={url}
                  rel="nofollow ugc noopener noreferrer"
                  target="_blank"
                  className="underline"
                >
                  {url}
                </a>
              </dd>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-sm font-semibold">{t('review.privateContact')}</dt>
            <dd dir="ltr">
              {[profile.profile_private?.contact_email, profile.profile_private?.contact_phone]
                .filter(Boolean)
                .join(' · ') || '—'}
            </dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="managers" className="flex flex-col gap-3 rounded-2xl border-2 p-6">
        <h2 id="managers" className="text-xl font-bold">
          {t('profiles.managers.title')}
        </h2>
        <ul className="flex flex-col gap-1">
          {managers.map((manager) => (
            <li key={manager.user_id}>
              <bdi className="font-semibold">{manager.display_name}</bdi>
              {' · '}
              {t(`profiles.managers.roles.${manager.role === 'owner' ? 'owner' : 'editor'}`)}
            </li>
          ))}
        </ul>
      </section>

      {decisions.length ? (
        <section
          aria-labelledby="decision"
          className="flex flex-col gap-4 rounded-2xl border-2 border-foreground p-6"
        >
          <h2 id="decision" className="text-xl font-bold">
            {t('review.decisionHeading')}
          </h2>
          <ActionForm
            action={reviewProfile}
            hidden={{ profileId: profile.id }}
            submitLabel={t('review.decide')}
            testId="review-decision"
          >
            <SelectField
              name="decision"
              label={t('review.decision')}
              options={decisions.map((decision) => ({
                value: decision,
                label: t(`review.decisions.${decision}`),
              }))}
            />
            <TextAreaField
              name="notePublic"
              label={t('review.notePublic')}
              hint={t('review.notePublicHint')}
              rows={4}
              maxLength={2000}
              dir="auto"
            />
            <TextAreaField
              name="noteInternal"
              label={t('review.noteInternal')}
              hint={t('review.noteInternalHint')}
              rows={3}
              maxLength={2000}
              dir="auto"
            />
          </ActionForm>
        </section>
      ) : null}

      <section aria-labelledby="history" className="flex flex-col gap-3">
        <h2 id="history" className="text-xl font-bold">
          {t('profiles.review.history')}
        </h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('profiles.review.noHistory')}</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {history.map((event) => (
              <li key={event.id} className="flex flex-col gap-1 border-s-2 ps-3 text-sm">
                <span className="font-semibold">
                  {t(
                    `profiles.review.actions.${event.action}` as 'profiles.review.actions.submitted',
                  )}
                  {' · '}
                  <time dateTime={event.created_at}>
                    {formatShortDate(event.created_at, locale)}
                  </time>
                </span>
                {event.note_public ? (
                  <span className="whitespace-pre-line" dir="auto">
                    {event.note_public}
                  </span>
                ) : null}
                {event.review_event_notes?.note_internal ? (
                  <span className="whitespace-pre-line text-muted-foreground" dir="auto">
                    {t('review.internalPrefix')} {event.review_event_notes.note_internal}
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
