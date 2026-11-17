'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { redirect } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { requireUser } from '@/lib/auth/guards';
import { randomSuffix, slugOrFallback } from '@/lib/content/slug';
import {
  fail,
  formDataToRecord,
  fromDbError,
  invalid,
  ok,
  type FormState,
} from '@/lib/forms/state';
import { contentTags } from '@/lib/supabase/public';
import { createClient } from '@/lib/supabase/server';
import {
  addManagerSchema,
  artistDetailsSchema,
  createProfileSchema,
  isOwnMediaPath,
  linkKind,
  linksSchema,
  localeMapFrom,
  missingForSubmit,
  professionalDetailsSchema,
  profileGeneralSchema,
  profileIdSchema,
  profilePrivateSchema,
  removeManagerSchema,
  setMediaSchema,
  studioDetailsSchema,
  venueDetailsSchema,
} from './schemas';

// Profile onboarding actions (roadmap phase 4). Shape: parse with Zod → requireUser → write with the
// user's client (RLS and the RPCs re-check everything) → revalidate → typed result.

const localeSchema = z.enum(routing.locales).catch(routing.defaultLocale);

function localeOf(record: Record<string, unknown>): Locale {
  return localeSchema.parse(record.locale);
}

/** Public pages read profiles through the tagged cache; the editor re-renders from the layout. */
function refresh() {
  revalidateTag(contentTags.profiles, { expire: 0 });
  revalidatePath('/[locale]/account', 'layout');
}

export async function createProfile(_state: FormState, formData: FormData): Promise<FormState> {
  const record = formDataToRecord(formData);
  const parsed = createProfileSchema.safeParse(record);
  if (!parsed.success) return invalid(parsed.error);
  await requireUser({ returnTo: '/account/profiles' });

  const supabase = await createClient();
  const { type, displayName } = parsed.data;
  let result = await supabase.rpc('create_profile', {
    profile_type: type,
    slug: slugOrFallback(displayName, type, randomSuffix),
    display_name: displayName,
  });
  // Slugs are unique across the catalogue: a taken one gets a short random suffix, once.
  if (result.error?.code === '23505') {
    result = await supabase.rpc('create_profile', {
      profile_type: type,
      slug: `${slugOrFallback(displayName, type, randomSuffix).slice(0, 72)}-${randomSuffix()}`,
      display_name: displayName,
    });
  }
  if (result.error || !result.data) return fromDbError(result.error);
  revalidatePath('/[locale]/account', 'layout');
  redirect({ href: `/account/profiles/${result.data}`, locale: localeOf(record) });
  return ok('created');
}

export async function updateProfileGeneral(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const record = formDataToRecord(formData);
  const parsed = profileGeneralSchema.safeParse(record);
  if (!parsed.success) return invalid(parsed.error);
  const links = linksSchema.safeParse(parsed.data.links);
  if (!links.success) return { ok: false, error: 'invalidInput', fields: { links: 'invalidUrl' } };
  await requireUser();

  const { profileId, displayName, slug, governorate, city } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('public_profiles')
    .update({
      display_name: displayName,
      slug,
      tagline: localeMapFrom(parsed.data, 'tagline'),
      bio: localeMapFrom(parsed.data, 'bio'),
      governorate_code: governorate,
      city,
      links: links.data.map((url) => ({ kind: linkKind(url), url })),
    })
    .eq('id', profileId)
    .select('id');
  if (error) {
    if (error.code === '23505')
      return { ok: false, error: 'slugTaken', fields: { slug: 'invalidSlug' } };
    return fromDbError(error);
  }
  if (!data?.length) return fail('forbidden');
  refresh();
  return ok('saved');
}

export async function updateProfileDetails(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const record = formDataToRecord(formData);
  const id = profileIdSchema.safeParse(record);
  if (!id.success) return invalid(id.error);
  await requireUser();
  const { profileId } = id.data;

  const supabase = await createClient();
  // The type comes from the database, never from the form.
  const { data: profile, error: readError } = await supabase
    .from('public_profiles')
    .select('type')
    .eq('id', profileId)
    .maybeSingle();
  if (readError) return fromDbError(readError);
  if (!profile) return fail('notFound');

  let tagIds: string[] | null = null;
  let tagTable: 'profile_genres' | 'profile_professions' | null = null;
  let detailError: { code?: string; message?: string } | null = null;
  let touched = 0;

  switch (profile.type) {
    case 'artist': {
      const parsed = artistDetailsSchema.safeParse(record);
      if (!parsed.success) return invalid(parsed.error);
      const { data, error } = await supabase
        .from('artist_details')
        .update({ kind: parsed.data.kind, formed_year: parsed.data.formedYear })
        .eq('profile_id', profileId)
        .select('profile_id');
      detailError = error;
      touched = data?.length ?? 0;
      tagIds = parsed.data.genres;
      tagTable = 'profile_genres';
      break;
    }
    case 'professional': {
      const parsed = professionalDetailsSchema.safeParse(record);
      if (!parsed.success) return invalid(parsed.error);
      const { data, error } = await supabase
        .from('professional_details')
        .update({
          years_experience: parsed.data.yearsExperience,
          available_for_hire: parsed.data.availableForHire,
        })
        .eq('profile_id', profileId)
        .select('profile_id');
      detailError = error;
      touched = data?.length ?? 0;
      tagIds = parsed.data.professions;
      tagTable = 'profile_professions';
      break;
    }
    case 'venue': {
      const parsed = venueDetailsSchema.safeParse(record);
      if (!parsed.success) return invalid(parsed.error);
      const { data, error } = await supabase
        .from('venue_details')
        .update({
          address: parsed.data.address,
          capacity: parsed.data.capacity,
          venue_kind: parsed.data.venueKind,
          has_backline: parsed.data.hasBackline,
        })
        .eq('profile_id', profileId)
        .select('profile_id');
      detailError = error;
      touched = data?.length ?? 0;
      break;
    }
    case 'studio': {
      const parsed = studioDetailsSchema.safeParse(record);
      if (!parsed.success) return invalid(parsed.error);
      const { data, error } = await supabase
        .from('studio_details')
        .update({ address: parsed.data.address, services: parsed.data.services })
        .eq('profile_id', profileId)
        .select('profile_id');
      detailError = error;
      touched = data?.length ?? 0;
      break;
    }
    case 'blog':
      return ok('saved');
  }
  if (detailError) return fromDbError(detailError);
  if (touched === 0) return fail('forbidden');

  if (tagTable && tagIds) {
    const column = tagTable === 'profile_genres' ? 'genre_id' : 'profession_id';
    const wanted = [...new Set(tagIds)];
    // Replace the set: drop what was unticked, add what is new (RLS: managers and admins only).
    let removal = supabase.from(tagTable).delete().eq('profile_id', profileId);
    if (wanted.length) removal = removal.not(column, 'in', `(${wanted.join(',')})`);
    const { error: deleteError } = await removal;
    if (deleteError) return fromDbError(deleteError);
    if (wanted.length) {
      const rows = wanted.map((tag) =>
        tagTable === 'profile_genres'
          ? { profile_id: profileId, genre_id: tag }
          : { profile_id: profileId, profession_id: tag },
      );
      const { error: insertError } =
        tagTable === 'profile_genres'
          ? await supabase
              .from('profile_genres')
              .upsert(rows as { profile_id: string; genre_id: string }[], {
                ignoreDuplicates: true,
              })
          : await supabase
              .from('profile_professions')
              .upsert(rows as { profile_id: string; profession_id: string }[], {
                ignoreDuplicates: true,
              });
      if (insertError) return fromDbError(insertError, { '23503': 'invalidInput' });
    }
  }
  refresh();
  return ok('saved');
}

export async function updateProfilePrivate(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = profilePrivateSchema.safeParse(formDataToRecord(formData));
  if (!parsed.success) return invalid(parsed.error);
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profile_private')
    .update({ contact_email: parsed.data.contactEmail, contact_phone: parsed.data.contactPhone })
    .eq('profile_id', parsed.data.profileId)
    .select('profile_id');
  if (error) return fromDbError(error);
  if (!data?.length) return fail('forbidden');
  revalidatePath('/[locale]/account', 'layout');
  return ok('saved');
}

/**
 * Records an uploaded avatar or cover (the browser uploads straight to Storage, where the policy
 * only accepts the profile's own folder) and deletes the file it replaces. `path: ''` removes it.
 * Pages bind the first two arguments; bound arguments reach the client, so all three are re-checked.
 */
export async function setProfileMedia(
  profileId: string,
  kind: 'avatar' | 'cover',
  path: string,
): Promise<FormState> {
  const parsed = setMediaSchema.safeParse({ profileId, kind, path });
  if (!parsed.success) return invalid(parsed.error);
  if (parsed.data.path && !isOwnMediaPath(parsed.data.profileId, parsed.data.path))
    return fail('forbidden');
  await requireUser();

  const supabase = await createClient();
  const column = kind === 'avatar' ? 'avatar_path' : 'cover_path';
  const { data: before, error: readError } = await supabase
    .from('public_profiles')
    .select('avatar_path, cover_path')
    .eq('id', profileId)
    .maybeSingle();
  if (readError) return fromDbError(readError);
  if (!before) return fail('notFound');

  const { data, error } =
    kind === 'avatar'
      ? await supabase
          .from('public_profiles')
          .update({ avatar_path: path || null })
          .eq('id', profileId)
          .select('id')
      : await supabase
          .from('public_profiles')
          .update({ cover_path: path || null })
          .eq('id', profileId)
          .select('id');
  if (error) return fromDbError(error);
  if (!data?.length) return fail('forbidden');

  const previous = before[column];
  if (previous && previous !== path && isOwnMediaPath(profileId, previous)) {
    // Best effort: an orphaned file only costs storage, never exposes anything new.
    const { error: removeError } = await supabase.storage.from('public-media').remove([previous]);
    if (removeError)
      console.error('[profiles] could not delete replaced media', removeError.message);
  }
  refresh();
  return ok(path ? 'saved' : 'removed');
}

export async function submitProfile(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = profileIdSchema.safeParse(formDataToRecord(formData));
  if (!parsed.success) return invalid(parsed.error);
  await requireUser();
  const supabase = await createClient();
  const { data: profile, error: readError } = await supabase
    .from('public_profiles')
    .select('tagline, governorate_code')
    .eq('id', parsed.data.profileId)
    .maybeSingle();
  if (readError) return fromDbError(readError);
  if (!profile) return fail('notFound');
  const missing = missingForSubmit(profile);
  if (missing.length) return fail('incomplete', { missing });

  const { error } = await supabase.rpc('submit_profile', { profile: parsed.data.profileId });
  if (error) return fromDbError(error);
  revalidatePath('/[locale]/account', 'layout');
  revalidatePath('/[locale]/admin', 'layout');
  return ok('submitted');
}

export async function deleteDraftProfile(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const record = formDataToRecord(formData);
  const parsed = profileIdSchema.safeParse(record);
  if (!parsed.success) return invalid(parsed.error);
  const user = await requireUser();
  const { profileId } = parsed.data;
  const supabase = await createClient();

  // Only an owner deletes, and only a draft (the RLS delete policy says the same). Check first,
  // because the files must go before the row: once the row is gone, nobody manages the folder.
  const [{ data: profile }, { data: manager }] = await Promise.all([
    supabase.from('public_profiles').select('status').eq('id', profileId).maybeSingle(),
    supabase
      .from('profile_managers')
      .select('role')
      .eq('profile_id', profileId)
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);
  if (!profile || profile.status !== 'draft' || manager?.role !== 'owner') return fail('forbidden');

  const folder = `profiles/${profileId}`;
  const { data: files } = await supabase.storage.from('public-media').list(folder);
  if (files?.length) {
    await supabase.storage.from('public-media').remove(files.map((f) => `${folder}/${f.name}`));
  }
  const { data, error } = await supabase
    .from('public_profiles')
    .delete()
    .eq('id', profileId)
    .eq('status', 'draft')
    .select('id');
  if (error) return fromDbError(error);
  if (!data?.length) return fail('forbidden');
  revalidatePath('/[locale]/account', 'layout');
  redirect({ href: '/account/profiles', locale: localeOf(record) });
  return ok('deleted');
}

export async function addProfileManager(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = addManagerSchema.safeParse(formDataToRecord(formData));
  if (!parsed.success) return invalid(parsed.error);
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc('add_profile_manager', {
    profile: parsed.data.profileId,
    email: parsed.data.email,
    manager_role: parsed.data.role,
  });
  if (error) return fromDbError(error, { P0002: 'unknownEmail', '23505': 'alreadyManager' });
  revalidatePath('/[locale]/account', 'layout');
  return ok('added');
}

export async function removeProfileManager(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const record = formDataToRecord(formData);
  const parsed = removeManagerSchema.safeParse(record);
  if (!parsed.success) return invalid(parsed.error);
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profile_managers')
    .delete()
    .eq('profile_id', parsed.data.profileId)
    .eq('user_id', parsed.data.userId)
    .select('user_id');
  if (error) return fromDbError(error, { P0001: 'lastOwner' });
  if (!data?.length) return fail('forbidden');
  revalidatePath('/[locale]/account', 'layout');
  if (parsed.data.userId === user.id) {
    redirect({ href: '/account/profiles', locale: localeOf(record) });
  }
  return ok('removed');
}
