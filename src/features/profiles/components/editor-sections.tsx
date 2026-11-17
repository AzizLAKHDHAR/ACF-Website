import type * as React from 'react';
import { getTranslations } from 'next-intl/server';
import { ActionForm } from '@/components/forms/action-form';
import {
  CheckboxField,
  CheckboxGroup,
  SelectField,
  TextAreaField,
  TextField,
} from '@/components/forms/fields';
import { ImageUpload } from '@/components/forms/image-upload';
import type { Locale } from '@/i18n/routing';
import { routing } from '@/i18n/routing';
import { formatShortDate } from '@/lib/content/format';
import { localizedText } from '@/lib/content/localized';
import { publicMediaUrl } from '@/lib/content/media';
import { MAX_DIMENSION } from '@/lib/media/images';
import type { Json } from '@/types/database';
import {
  addProfileManager,
  deleteDraftProfile,
  removeProfileManager,
  setProfileMedia,
  submitProfile,
  updateProfileDetails,
  updateProfileGeneral,
  updateProfilePrivate,
} from '../actions';
import type { EditableProfile } from '../queries';
import {
  artistKinds,
  BIO_MAX,
  canSubmit,
  managerRoles,
  MAX_LINKS,
  studioServices,
  TAGLINE_MAX,
} from '../schemas';
import { StatusBadge } from './status-badge';

type Option = { id: string; name: Json };

/** A titled block of the editor. */
export function EditorSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-5 rounded-2xl border-2 p-6">
      <div className="flex flex-col gap-1">
        <h2 id={id} className="text-xl font-bold">
          {title}
        </h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function localeValue(map: Json, locale: Locale): string {
  if (!map || typeof map !== 'object' || Array.isArray(map)) return '';
  const value = map[locale];
  return typeof value === 'string' ? value : '';
}

function linkUrls(links: Json): string[] {
  if (!Array.isArray(links)) return [];
  return links.flatMap((link) =>
    link && typeof link === 'object' && !Array.isArray(link) && typeof link.url === 'string'
      ? [link.url]
      : [],
  );
}

export async function StatusSection({
  profile,
  locale,
  history,
}: {
  profile: EditableProfile;
  locale: Locale;
  history: { id: string; action: string; note_public: string | null; created_at: string }[];
}) {
  const t = await getTranslations({ locale, namespace: 'profiles' });
  const latestNote = history.find((event) => event.note_public)?.note_public;
  return (
    <EditorSection id="status" title={t('editor.sections.status')}>
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={profile.status} />
        <p className="text-sm">{t(`statusHelp.${profile.status}`)}</p>
      </div>
      {latestNote && (profile.status === 'rejected' || profile.status === 'suspended') ? (
        <div className="rounded-xl border-2 border-destructive p-4" data-testid="review-note">
          <p className="text-sm font-semibold">{t('review.noteFromTeam')}</p>
          <p className="whitespace-pre-line" dir="auto">
            {latestNote}
          </p>
        </div>
      ) : null}
      {canSubmit(profile.status) ? (
        <ActionForm
          action={submitProfile}
          hidden={{ profileId: profile.id }}
          submitLabel={profile.status === 'rejected' ? t('review.resubmit') : t('review.submit')}
          testId="submit-profile"
        >
          <p className="text-sm text-muted-foreground">{t('review.submitHint')}</p>
        </ActionForm>
      ) : null}
      <details className="text-sm">
        <summary className="cursor-pointer font-semibold">{t('review.history')}</summary>
        {history.length === 0 ? (
          <p className="mt-2 text-muted-foreground">{t('review.noHistory')}</p>
        ) : (
          <ol className="mt-3 flex flex-col gap-2">
            {history.map((event) => (
              <li key={event.id} className="flex flex-col gap-0.5 border-s-2 ps-3">
                <span className="font-semibold">
                  {t(`review.actions.${event.action}` as 'review.actions.submitted')}
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
              </li>
            ))}
          </ol>
        )}
      </details>
    </EditorSection>
  );
}

export async function GeneralSection({
  profile,
  locale,
  governorates,
}: {
  profile: EditableProfile;
  locale: Locale;
  governorates: { code: string; name: Json }[];
}) {
  const t = await getTranslations({ locale });
  const links = linkUrls(profile.links);
  return (
    <EditorSection
      id="general"
      title={t('profiles.editor.sections.general')}
      description={t('profiles.editor.generalIntro')}
    >
      <ActionForm
        action={updateProfileGeneral}
        hidden={{ profileId: profile.id }}
        submitLabel={t('profiles.save')}
        testId="profile-general"
      >
        <TextField
          name="displayName"
          label={t('profiles.fields.displayName')}
          defaultValue={profile.display_name}
          maxLength={120}
          required
          dir="auto"
        />
        <TextField
          name="slug"
          label={t('profiles.fields.slug')}
          hint={t('profiles.fields.slugHint')}
          defaultValue={profile.slug}
          maxLength={80}
          required
          dir="ltr"
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          autoCapitalize="off"
          spellCheck={false}
        />
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-1 text-sm font-semibold">{t('profiles.fields.tagline')}</legend>
          <p className="text-sm text-muted-foreground">{t('profiles.fields.taglineHint')}</p>
          {routing.locales.map((language) => (
            <TextField
              key={language}
              name={`tagline_${language}`}
              label={t(`localeNames.${language}`)}
              defaultValue={localeValue(profile.tagline, language)}
              maxLength={TAGLINE_MAX}
              lang={language}
              dir={language === 'ar' ? 'rtl' : 'ltr'}
            />
          ))}
        </fieldset>
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-1 text-sm font-semibold">{t('profiles.fields.bio')}</legend>
          {routing.locales.map((language) => (
            <TextAreaField
              key={language}
              name={`bio_${language}`}
              label={t(`localeNames.${language}`)}
              defaultValue={localeValue(profile.bio, language)}
              maxLength={BIO_MAX}
              rows={5}
              lang={language}
              dir={language === 'ar' ? 'rtl' : 'ltr'}
            />
          ))}
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
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
          <TextField
            name="city"
            label={t('profiles.fields.city')}
            defaultValue={profile.city ?? ''}
            maxLength={80}
            dir="auto"
          />
        </div>
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-sm font-semibold">{t('profiles.fields.links')}</legend>
          <p className="text-sm text-muted-foreground">{t('profiles.fields.linksHint')}</p>
          {Array.from({ length: MAX_LINKS }, (_, index) => (
            <TextField
              key={index}
              id={`link-${index}`}
              name="links"
              type="url"
              inputMode="url"
              dir="ltr"
              label={t('profiles.fields.link', { number: index + 1 })}
              defaultValue={links[index] ?? ''}
              maxLength={300}
            />
          ))}
        </fieldset>
      </ActionForm>
    </EditorSection>
  );
}

export async function DetailsSection({
  profile,
  locale,
  genres,
  professions,
}: {
  profile: EditableProfile;
  locale: Locale;
  genres: Option[];
  professions: Option[];
}) {
  const t = await getTranslations({ locale });
  if (profile.type === 'blog') return null;
  const tagOptions = (options: Option[]) =>
    options.map((option) => ({ value: option.id, label: localizedText(option.name, locale) }));

  let fields: React.ReactNode = null;
  if (profile.type === 'artist') {
    const details = profile.artist_details;
    fields = (
      <>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            name="kind"
            label={t('profiles.details.kind')}
            defaultValue={details?.kind ?? 'solo'}
            options={artistKinds.map((kind) => ({
              value: kind,
              label: t(`content.profile.kind.${kind}`),
            }))}
          />
          <TextField
            name="formedYear"
            type="number"
            inputMode="numeric"
            min={1900}
            max={2100}
            label={t('profiles.details.formedYear')}
            defaultValue={details?.formed_year ?? ''}
          />
        </div>
        <CheckboxGroup
          name="genres"
          legend={t('profiles.details.genres')}
          options={tagOptions(genres)}
          selected={profile.profile_genres.map((row) => row.genre_id)}
        />
      </>
    );
  } else if (profile.type === 'professional') {
    const details = profile.professional_details;
    fields = (
      <>
        <TextField
          name="yearsExperience"
          type="number"
          inputMode="numeric"
          min={0}
          max={80}
          label={t('profiles.details.yearsExperience')}
          defaultValue={details?.years_experience ?? ''}
        />
        <CheckboxField
          name="availableForHire"
          label={t('profiles.details.availableForHire')}
          defaultChecked={details?.available_for_hire ?? false}
        />
        <CheckboxGroup
          name="professions"
          legend={t('profiles.details.professions')}
          options={tagOptions(professions)}
          selected={profile.profile_professions.map((row) => row.profession_id)}
        />
      </>
    );
  } else if (profile.type === 'venue') {
    const details = profile.venue_details;
    fields = (
      <>
        <TextField
          name="address"
          label={t('profiles.details.address')}
          defaultValue={details?.address ?? ''}
          maxLength={200}
          dir="auto"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            name="capacity"
            type="number"
            inputMode="numeric"
            min={1}
            label={t('profiles.details.capacity')}
            defaultValue={details?.capacity ?? ''}
          />
          <TextField
            name="venueKind"
            label={t('profiles.details.venueKind')}
            hint={t('profiles.details.venueKindHint')}
            defaultValue={details?.venue_kind ?? ''}
            maxLength={60}
            dir="auto"
          />
        </div>
        <CheckboxField
          name="hasBackline"
          label={t('profiles.details.hasBackline')}
          defaultChecked={details?.has_backline ?? false}
        />
      </>
    );
  } else if (profile.type === 'studio') {
    const details = profile.studio_details;
    fields = (
      <>
        <TextField
          name="address"
          label={t('profiles.details.address')}
          defaultValue={details?.address ?? ''}
          maxLength={200}
          dir="auto"
        />
        <CheckboxGroup
          name="services"
          legend={t('profiles.details.services')}
          options={studioServices.map((service) => ({
            value: service,
            label: t(`content.profile.service.${service}`),
          }))}
          selected={details?.services ?? []}
        />
      </>
    );
  }

  return (
    <EditorSection id="details" title={t('profiles.editor.sections.details')}>
      <ActionForm
        action={updateProfileDetails}
        hidden={{ profileId: profile.id }}
        submitLabel={t('profiles.save')}
        testId="profile-details"
      >
        {fields}
      </ActionForm>
    </EditorSection>
  );
}

export async function MediaSection({
  profile,
  locale,
}: {
  profile: EditableProfile;
  locale: Locale;
}) {
  const t = await getTranslations({ locale, namespace: 'profiles' });
  const folder = `profiles/${profile.id}`;
  return (
    <EditorSection
      id="media"
      title={t('editor.sections.media')}
      description={t('media.intro')}
    >
      <div className="grid gap-8 sm:grid-cols-2">
        <ImageUpload
          label={t('media.avatar')}
          hint={t('media.avatarHint')}
          folder={folder}
          prefix="avatar"
          maxDimension={MAX_DIMENSION.avatar}
          previewUrl={publicMediaUrl(profile.avatar_path)}
          previewClassName="size-32 rounded-2xl border-2 object-cover"
          onUploaded={setProfileMedia.bind(null, profile.id, 'avatar')}
          onRemove={setProfileMedia.bind(null, profile.id, 'avatar', '')}
        />
        <ImageUpload
          label={t('media.cover')}
          hint={t('media.coverHint')}
          folder={folder}
          prefix="cover"
          maxDimension={MAX_DIMENSION.cover}
          previewUrl={publicMediaUrl(profile.cover_path)}
          previewClassName="aspect-[3/1] w-full rounded-2xl border-2 object-cover"
          onUploaded={setProfileMedia.bind(null, profile.id, 'cover')}
          onRemove={setProfileMedia.bind(null, profile.id, 'cover', '')}
        />
      </div>
    </EditorSection>
  );
}

export async function PrivateSection({
  profile,
  locale,
}: {
  profile: EditableProfile;
  locale: Locale;
}) {
  const t = await getTranslations({ locale, namespace: 'profiles' });
  return (
    <EditorSection
      id="private"
      title={t('editor.sections.private')}
      description={t('private.intro')}
    >
      <ActionForm
        action={updateProfilePrivate}
        hidden={{ profileId: profile.id }}
        submitLabel={t('save')}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            name="contactEmail"
            type="email"
            autoComplete="email"
            dir="ltr"
            label={t('private.contactEmail')}
            defaultValue={profile.profile_private?.contact_email ?? ''}
            maxLength={254}
          />
          <TextField
            name="contactPhone"
            type="tel"
            autoComplete="tel"
            dir="ltr"
            label={t('private.contactPhone')}
            defaultValue={profile.profile_private?.contact_phone ?? ''}
            maxLength={32}
          />
        </div>
      </ActionForm>
    </EditorSection>
  );
}

export async function ManagersSection({
  profileId,
  locale,
  managers,
  currentUserId,
  isOwner,
}: {
  profileId: string;
  locale: Locale;
  managers: { user_id: string; display_name: string; role: string }[];
  currentUserId: string;
  isOwner: boolean;
}) {
  const t = await getTranslations({ locale, namespace: 'profiles.managers' });
  return (
    <EditorSection id="managers" title={t('title')} description={t('intro')}>
      <ul className="flex flex-col gap-3">
        {managers.map((manager) => {
          const self = manager.user_id === currentUserId;
          const role = manager.role === 'owner' ? 'owner' : 'editor';
          return (
            <li
              key={manager.user_id}
              className="flex flex-wrap items-center gap-3 rounded-xl border p-3"
            >
              <span className="min-w-0 flex-1 font-semibold">
                <bdi>{manager.display_name}</bdi>
                {self ? <span className="text-muted-foreground"> · {t('you')}</span> : null}
              </span>
              <span className="text-sm text-muted-foreground">{t(`roles.${role}`)}</span>
              {isOwner || self ? (
                <ActionForm
                  action={removeProfileManager}
                  hidden={{ profileId, userId: manager.user_id }}
                  submitLabel={self ? t('leave') : t('remove')}
                  submitVariant="outline"
                  confirmMessage={self ? t('leaveConfirm') : t('removeConfirm')}
                  className="gap-2"
                />
              ) : null}
            </li>
          );
        })}
      </ul>
      {isOwner ? (
        <div className="flex flex-col gap-3 border-t pt-5">
          <h3 className="font-bold">{t('add.title')}</h3>
          <ActionForm
            action={addProfileManager}
            hidden={{ profileId }}
            submitLabel={t('add.submit')}
            resetOnSuccess
            testId="add-manager"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                name="email"
                type="email"
                dir="ltr"
                autoComplete="off"
                label={t('add.email')}
                hint={t('add.emailHint')}
                maxLength={254}
                required
              />
              <SelectField
                name="role"
                label={t('add.role')}
                defaultValue="editor"
                options={managerRoles.map((role) => ({ value: role, label: t(`roles.${role}`) }))}
              />
            </div>
          </ActionForm>
        </div>
      ) : null}
    </EditorSection>
  );
}

export async function DangerSection({ profileId, locale }: { profileId: string; locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'profiles.danger' });
  return (
    <EditorSection id="danger" title={t('title')} description={t('hint')}>
      <ActionForm
        action={deleteDraftProfile}
        hidden={{ profileId }}
        submitLabel={t('delete')}
        submitVariant="destructive"
        confirmMessage={t('confirm')}
      />
    </EditorSection>
  );
}
