import 'server-only';
import { cache } from 'react';
import { sessionClient, throwIfError } from '@/lib/supabase/session';

// The signed-in user's own notifications (RLS: own rows only; admins included).

export async function listNotifications(userId: string, limit = 50) {
  const supabase = await sessionClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('notifications')
    .select('id, kind, payload, read_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  throwIfError(error);
  return data ?? [];
}

/** Unread count for the bell in the hidden areas' header (0 in the shell preview). */
export const countUnreadNotifications = cache(async (userId: string) => {
  const supabase = await sessionClient();
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);
  throwIfError(error);
  return count ?? 0;
});
