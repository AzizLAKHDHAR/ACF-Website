'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/guards';
import { formDataToRecord, fromDbError, invalid, ok, type FormState } from '@/lib/forms/state';
import { createClient } from '@/lib/supabase/server';
import { announcementFlagSchema, announcementIdSchema, announcementSchema } from './schemas';

function refresh() {
  revalidatePath('/[locale]/member', 'layout');
  revalidatePath('/[locale]/board', 'layout');
}

/** The board posts an announcement; author and source come from the session, the audience is notified. */
export async function createAnnouncement(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = announcementSchema.safeParse(formDataToRecord(formData));
  if (!parsed.success) return invalid(parsed.error);
  await requireRole('board');
  const supabase = await createClient();
  const { error } = await supabase.from('announcements').insert({
    title: parsed.data.title,
    body_md: parsed.data.body,
    audience: parsed.data.audience,
    pinned: parsed.data.pinned,
  });
  if (error) return fromDbError(error);
  refresh();
  return ok('published');
}

async function updateAnnouncement(
  announcementId: string,
  change: { hidden_at: string | null } | { pinned: boolean },
): Promise<FormState | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('announcements')
    .update(change)
    .eq('id', announcementId)
    .select('id');
  if (error) return fromDbError(error);
  if (!data?.length) return { ok: false, error: 'notFound' };
  return null;
}

/** Hidden announcements leave the members' feed but stay on the board's list. */
export async function setAnnouncementHidden(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = announcementFlagSchema.safeParse(formDataToRecord(formData));
  if (!parsed.success) return invalid(parsed.error);
  await requireRole('board');
  const failure = await updateAnnouncement(parsed.data.announcementId, {
    hidden_at: parsed.data.value ? new Date().toISOString() : null,
  });
  if (failure) return failure;
  refresh();
  return ok(parsed.data.value ? 'hidden' : 'shown');
}

export async function setAnnouncementPinned(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = announcementFlagSchema.safeParse(formDataToRecord(formData));
  if (!parsed.success) return invalid(parsed.error);
  await requireRole('board');
  const failure = await updateAnnouncement(parsed.data.announcementId, {
    pinned: parsed.data.value,
  });
  if (failure) return failure;
  refresh();
  return ok(parsed.data.value ? 'pinned' : 'unpinned');
}

export async function deleteAnnouncement(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = announcementIdSchema.safeParse(formDataToRecord(formData));
  if (!parsed.success) return invalid(parsed.error);
  await requireRole('board');
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', parsed.data.announcementId)
    .select('id');
  if (error) return fromDbError(error);
  if (!data?.length) return { ok: false, error: 'notFound' };
  refresh();
  return ok('deleted');
}
