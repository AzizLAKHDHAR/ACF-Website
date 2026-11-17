'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/guards';
import { formDataToRecord, fromDbError, invalid, ok, type FormState } from '@/lib/forms/state';
import { createClient } from '@/lib/supabase/server';
import { shiftIdSchema, shiftSchema, signupIdSchema } from './schemas';

function refresh() {
  revalidatePath('/[locale]/member', 'layout');
  revalidatePath('/[locale]/board', 'layout');
}

/** A member takes a place; the capacity trigger locks the shift row, so a full shift says so. */
export async function signUpForShift(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = shiftIdSchema.safeParse(formDataToRecord(formData));
  if (!parsed.success) return invalid(parsed.error);
  const user = await requireRole('member');
  const supabase = await createClient();
  const { error } = await supabase
    .from('volunteer_signups')
    .insert({ shift_id: parsed.data.shiftId, user_id: user.id });
  if (error) return fromDbError(error, { P0001: 'shiftFull' });
  refresh();
  return ok('signedUp');
}

/** A member gives their place back. */
export async function cancelShiftSignup(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = shiftIdSchema.safeParse(formDataToRecord(formData));
  if (!parsed.success) return invalid(parsed.error);
  const user = await requireRole('member');
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('volunteer_signups')
    .delete()
    .eq('shift_id', parsed.data.shiftId)
    .eq('user_id', user.id)
    .select('id');
  if (error) return fromDbError(error);
  if (!data?.length) return { ok: false, error: 'notFound' };
  refresh();
  return ok('signupCancelled');
}

export async function createShift(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = shiftSchema.safeParse(formDataToRecord(formData));
  if (!parsed.success) return invalid(parsed.error);
  await requireRole('board');
  const value = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from('volunteer_shifts').insert({
    event_id: value.eventId,
    role_label: value.roleLabel,
    starts_at: value.startsAt,
    ends_at: value.endsAt,
    capacity: value.capacity,
  });
  if (error) return fromDbError(error);
  refresh();
  return ok('created');
}

export async function deleteShift(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = shiftIdSchema.safeParse(formDataToRecord(formData));
  if (!parsed.success) return invalid(parsed.error);
  await requireRole('board');
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('volunteer_shifts')
    .delete()
    .eq('id', parsed.data.shiftId)
    .select('id');
  if (error) return fromDbError(error);
  if (!data?.length) return { ok: false, error: 'notFound' };
  refresh();
  return ok('deleted');
}

/** The board removes someone's sign-up (for instance when they called to cancel). */
export async function removeSignup(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = signupIdSchema.safeParse(formDataToRecord(formData));
  if (!parsed.success) return invalid(parsed.error);
  await requireRole('board');
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('volunteer_signups')
    .delete()
    .eq('id', parsed.data.signupId)
    .select('id');
  if (error) return fromDbError(error);
  if (!data?.length) return { ok: false, error: 'notFound' };
  refresh();
  return ok('removed');
}
