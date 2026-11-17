import 'server-only';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

// Reads for the profile owner's screens. They use the signed-in user's client, so RLS decides what
// comes back; "is the caller a manager" is checked explicitly because approved profiles are
// readable by everyone.

function throwIf(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

/** The profiles the user manages, newest first, with their role on each. */
export async function listMyProfiles(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profile_managers')
    .select(
      'role, public_profiles(id, type, slug, status, display_name, avatar_path, governorate_code, updated_at)',
    )
    .eq('user_id', userId);
  throwIf(error);
  return (data ?? [])
    .flatMap((row) =>
      row.public_profiles ? [{ ...row.public_profiles, role: row.role as 'owner' | 'editor' }] : [],
    )
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

/** The caller's role on a profile, or null when they don't manage it. */
export const getManagerRole = cache(async (profileId: string, userId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profile_managers')
    .select('role')
    .eq('profile_id', profileId)
    .eq('user_id', userId)
    .maybeSingle();
  throwIf(error);
  return (data?.role as 'owner' | 'editor' | undefined) ?? null;
});

const editorColumns = `
  id, type, slug, status, display_name, tagline, bio, governorate_code, city, avatar_path, cover_path,
  links, submitted_at, approved_at, updated_at,
  artist_details(kind, formed_year),
  professional_details(years_experience, available_for_hire),
  venue_details(address, capacity, venue_kind, has_backline),
  studio_details(address, services),
  profile_genres(genre_id),
  profile_professions(profession_id),
  profile_private(contact_email, contact_phone)
` as const;

/** Everything the editor shows for one profile (any status), or null if it isn't visible. */
export async function getEditableProfile(profileId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('public_profiles')
    .select(editorColumns)
    .eq('id', profileId)
    .maybeSingle();
  throwIf(error);
  return data;
}
export type EditableProfile = NonNullable<Awaited<ReturnType<typeof getEditableProfile>>>;

/** Review history of a profile: public notes only (internal notes are admin-only, another table). */
export async function listReviewEvents(targetType: 'profile' | 'event' | 'post', targetId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('review_events')
    .select('id, action, note_public, created_at')
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .order('created_at', { ascending: false });
  throwIf(error);
  return data ?? [];
}

export async function listManagers(profileId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('list_profile_managers', { profile: profileId });
  throwIf(error);
  return data ?? [];
}
