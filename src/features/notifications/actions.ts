'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/guards';
import { id } from '@/lib/forms/schemas';
import { formDataToRecord, fromDbError, invalid, ok, type FormState } from '@/lib/forms/state';
import { createClient } from '@/lib/supabase/server';

const notificationIdSchema = z.object({ notificationId: id });

function refresh() {
  // The unread count shows on the account page and in every hidden area's header. Public pages
  // (statically cached) are left alone.
  for (const area of ['account', 'member', 'board', 'admin'] as const) {
    revalidatePath(`/[locale]/${area}`, 'layout');
  }
}

/** Marks one of the user's notifications read (RLS: own rows; only read_at is updatable). */
export async function markNotificationRead(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = notificationIdSchema.safeParse(formDataToRecord(formData));
  if (!parsed.success) return invalid(parsed.error);
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', parsed.data.notificationId)
    .eq('user_id', user.id)
    .is('read_at', null);
  if (error) return fromDbError(error);
  refresh();
  return ok('markedRead');
}

export async function markAllNotificationsRead(): Promise<FormState> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('read_at', null);
  if (error) return fromDbError(error);
  refresh();
  return ok('markedRead');
}
