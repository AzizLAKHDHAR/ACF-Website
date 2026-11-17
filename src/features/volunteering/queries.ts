import 'server-only';
import { startOfTodayInTunis } from '@/lib/content/format';
import { sessionClient, throwIfError } from '@/lib/supabase/session';
import type { Json } from '@/types/database';

// Volunteer shifts as the signed-in user. volunteer_shift_overview() gives every member the places
// taken and their own sign-up; only the board reads who signed up (volunteer_signups RLS).

/** Upcoming shifts with their event (when the user can see it), soonest first. */
export async function listUpcomingShifts() {
  const supabase = await sessionClient();
  if (!supabase) return [];
  const { data: shifts, error } = await supabase.rpc('volunteer_shift_overview');
  throwIfError(error);
  const eventIds = [...new Set((shifts ?? []).flatMap((s) => (s.event_id ? [s.event_id] : [])))];
  const events = new Map<string, { slug: string; title: Json; starts_at: string }>();
  if (eventIds.length > 0) {
    const { data, error: eventsError } = await supabase
      .from('events')
      .select('id, slug, title, starts_at')
      .in('id', eventIds);
    throwIfError(eventsError);
    for (const event of data ?? []) events.set(event.id, event);
  }
  return (shifts ?? []).map((shift) => ({
    ...shift,
    taken: Number(shift.taken),
    event: shift.event_id ? (events.get(shift.event_id) ?? null) : null,
  }));
}

/** Who signed up for these shifts (the board only; RLS returns members their own rows). */
export async function listSignups(shiftIds: string[]) {
  const supabase = await sessionClient();
  if (!supabase || shiftIds.length === 0) return [];
  const { data, error } = await supabase
    .from('volunteer_signups')
    .select('id, shift_id, user_id, created_at, account:accounts(display_name)')
    .in('shift_id', shiftIds)
    .order('created_at', { ascending: true });
  throwIfError(error);
  return data ?? [];
}

/** Published events from today on, for the board's shift form. */
export async function listUpcomingEvents() {
  const supabase = await sessionClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('events')
    .select('id, title, starts_at')
    .eq('status', 'published')
    .gte('starts_at', startOfTodayInTunis())
    .order('starts_at', { ascending: true })
    .limit(100);
  throwIfError(error);
  return data ?? [];
}
