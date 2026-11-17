import 'server-only';
import { startOfTodayInTunis } from '@/lib/content/format';
import { sessionClient, throwIfError } from '@/lib/supabase/session';
import type { Json } from '@/types/database';

// Volunteer shifts as the signed-in user. Counts use the existing SECURITY DEFINER RPC; each member
// sees only their own sign-up through volunteer_signups RLS.

/** Upcoming shifts with their event (when the user can see it), soonest first. */
export async function listUpcomingShifts() {
  const supabase = await sessionClient();
  if (!supabase) return [];
  const { data: userData, error: userError } = await supabase.auth.getUser();
  throwIfError(userError);
  if (!userData.user) return [];

  const { data: shifts, error: shiftsError } = await supabase
    .from('volunteer_shifts')
    .select('id, event_id, role_label, starts_at, ends_at, capacity')
    .gt('ends_at', new Date().toISOString())
    .order('starts_at', { ascending: true });
  throwIfError(shiftsError);

  const shiftRows = shifts ?? [];
  const shiftIds = shiftRows.map((shift) => shift.id);
  const eventIds = [
    ...new Set(shiftRows.flatMap((shift) => (shift.event_id ? [shift.event_id] : []))),
  ];
  const events = new Map<string, { slug: string; title: Json; starts_at: string }>();
  if (eventIds.length > 0) {
    const { data, error: eventsError } = await supabase
      .from('events')
      .select('id, slug, title, starts_at')
      .in('id', eventIds);
    throwIfError(eventsError);
    for (const event of data ?? []) events.set(event.id, event);
  }

  const countEntries = await Promise.all(
    eventIds.map(async (eventId) => {
      const { data, error } = await supabase.rpc('volunteer_shift_counts', { event: eventId });
      throwIfError(error);
      return data ?? [];
    }),
  );
  const takenByShift = new Map(
    countEntries.flat().map((count) => [count.shift_id, Number(count.taken)]),
  );

  const ownSignups =
    shiftIds.length > 0
      ? await supabase
          .from('volunteer_signups')
          .select('shift_id')
          .eq('user_id', userData.user.id)
          .in('shift_id', shiftIds)
      : { data: [], error: null };
  throwIfError(ownSignups.error);
  const signedUpShiftIds = new Set((ownSignups.data ?? []).map((signup) => signup.shift_id));

  return shiftRows.map((shift) => ({
    shift_id: shift.id,
    event_id: shift.event_id,
    role_label: shift.role_label,
    starts_at: shift.starts_at,
    ends_at: shift.ends_at,
    capacity: shift.capacity,
    taken: takenByShift.get(shift.id) ?? 0,
    signed_up: signedUpShiftIds.has(shift.id),
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
