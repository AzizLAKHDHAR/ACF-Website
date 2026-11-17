import 'server-only';
import { cache } from 'react';
import { startOfTodayInTunis } from '@/lib/content/format';
import { sessionClient, throwIfError } from '@/lib/supabase/session';
import { rsvpResponses, type RsvpResponse } from './schemas';

// Meetings as the signed-in user (RLS: the meetings of their audience; their own answer, or every
// answer for the board). Counts come from meeting_rsvp_counts(), which members may call.

const meetingColumns =
  'id, title, description_md, starts_at, ends_at, location_text, online_url, audience, cancelled_at' as const;

/** Upcoming meetings (from today on, soonest first) or past ones (latest first), with the user's answer. */
export async function listMeetings(
  userId: string,
  { when = 'upcoming', limit = 50 }: { when?: 'upcoming' | 'past'; limit?: number } = {},
) {
  const supabase = await sessionClient();
  if (!supabase) return [];
  const today = startOfTodayInTunis();
  const query = supabase
    .from('meetings')
    .select(`${meetingColumns}, meeting_rsvps(response)` as const)
    .eq('meeting_rsvps.user_id', userId)
    .limit(limit);
  const { data, error } =
    when === 'upcoming'
      ? await query.gte('starts_at', today).order('starts_at', { ascending: true })
      : await query.lt('starts_at', today).order('starts_at', { ascending: false });
  throwIfError(error);
  return (data ?? []).map(({ meeting_rsvps, ...meeting }) => ({
    ...meeting,
    myAnswer: meeting_rsvps[0]?.response ?? null,
  }));
}

export const getMeeting = cache(async (meetingId: string) => {
  const supabase = await sessionClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('meetings')
    .select(meetingColumns)
    .eq('id', meetingId)
    .maybeSingle();
  throwIfError(error);
  return data;
});

export type AnswerCounts = Record<RsvpResponse, number>;

/** The user's answer, the counts per answer, and (for the board) the attendance list. */
export async function getMeetingAnswers(
  meetingId: string,
  userId: string,
  withAttendance: boolean,
) {
  const empty: AnswerCounts = { yes: 0, maybe: 0, no: 0 };
  const supabase = await sessionClient();
  if (!supabase) return { mine: null, counts: empty, attendance: [] };
  const [counts, mine, attendance] = await Promise.all([
    supabase.rpc('meeting_rsvp_counts', { meeting: meetingId }),
    supabase
      .from('meeting_rsvps')
      .select('response, note')
      .eq('meeting_id', meetingId)
      .eq('user_id', userId)
      .maybeSingle(),
    withAttendance
      ? supabase
          .from('meeting_rsvps')
          .select('user_id, response, note, updated_at, account:accounts(display_name)')
          .eq('meeting_id', meetingId)
          .order('updated_at', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ]);
  throwIfError(counts.error);
  throwIfError(mine.error);
  throwIfError(attendance.error);
  const totals = { ...empty };
  for (const row of counts.data ?? []) {
    if ((rsvpResponses as readonly string[]).includes(row.response))
      totals[row.response] = Number(row.total);
  }
  return { mine: mine.data, counts: totals, attendance: attendance.data ?? [] };
}
