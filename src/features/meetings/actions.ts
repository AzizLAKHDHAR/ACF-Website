'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/guards';
import { formDataToRecord, fromDbError, invalid, ok, type FormState } from '@/lib/forms/state';
import { createClient } from '@/lib/supabase/server';
import { answerMeetingSchema, meetingIdSchema, meetingSchema } from './schemas';

function refresh() {
  revalidatePath('/[locale]/member', 'layout');
  revalidatePath('/[locale]/board', 'layout');
}

/**
 * A member answers yes, maybe or no (and may change it). answer_meeting() runs as the caller, so the
 * meeting_rsvps policies decide; cancelled and finished meetings refuse answers.
 */
export async function answerMeeting(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = answerMeetingSchema.safeParse(formDataToRecord(formData));
  if (!parsed.success) return invalid(parsed.error);
  await requireRole('member');
  const supabase = await createClient();
  const { error } = await supabase.rpc('answer_meeting', {
    meeting: parsed.data.meetingId,
    answer: parsed.data.answer,
    answer_note: parsed.data.note ?? undefined,
  });
  if (error) return fromDbError(error, { P0001: 'meetingClosed', P0002: 'notFound' });
  refresh();
  return ok('answered');
}

/** The board schedules a meeting; its audience is notified in-app (trigger). */
export async function createMeeting(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = meetingSchema.safeParse(formDataToRecord(formData));
  if (!parsed.success) return invalid(parsed.error);
  await requireRole('board');
  const value = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from('meetings').insert({
    title: value.title,
    description_md: value.description,
    starts_at: value.startsAt,
    ends_at: value.endsAt,
    location_text: value.location,
    online_url: value.onlineUrl,
    audience: value.audience,
  });
  if (error) return fromDbError(error);
  refresh();
  return ok('created');
}

/** Cancelling keeps the meeting (and its answers) visible, marked cancelled; the audience is told. */
export async function cancelMeeting(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = meetingIdSchema.safeParse(formDataToRecord(formData));
  if (!parsed.success) return invalid(parsed.error);
  await requireRole('board');
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('meetings')
    .update({ cancelled_at: new Date().toISOString() })
    .eq('id', parsed.data.meetingId)
    .is('cancelled_at', null)
    .select('id');
  if (error) return fromDbError(error);
  if (!data?.length) return { ok: false, error: 'notFound' };
  refresh();
  return ok('cancelled');
}

export async function deleteMeeting(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = meetingIdSchema.safeParse(formDataToRecord(formData));
  if (!parsed.success) return invalid(parsed.error);
  await requireRole('board');
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('meetings')
    .delete()
    .eq('id', parsed.data.meetingId)
    .select('id');
  if (error) return fromDbError(error);
  if (!data?.length) return { ok: false, error: 'notFound' };
  refresh();
  return ok('deleted');
}
