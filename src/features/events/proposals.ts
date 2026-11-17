import 'server-only';
import { createClient } from '@/lib/supabase/server';

// Proposal reads with the signed-in user's client: proposers see their own events (any status),
// the board sees every event (events RLS). Public pages keep using ./queries (anon, cached).

function throwIf(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

const proposalColumns =
  `id, slug, title, starts_at, ends_at, status, venue_text, venue_profile_id, created_at,
  venue:public_profiles!events_venue_profile_id_fkey(slug, display_name),
  event_lineup(profile_id, public_profiles(display_name))` as const;

/** The user's proposals made as this profile (a venue's are at the venue; an artist's list it). */
export async function listProfileProposals(userId: string, profileId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('events')
    .select(proposalColumns)
    .eq('proposed_by', userId)
    .order('starts_at', { ascending: false });
  throwIf(error);
  const events = (data ?? []).filter(
    (event) =>
      event.venue_profile_id === profileId ||
      event.event_lineup.some((entry) => entry.profile_id === profileId),
  );
  const notes = await latestNotes(events.map((event) => event.id));
  return events.map((event) => ({ ...event, note: notes.get(event.id) ?? null }));
}

/** Proposals waiting for the board, soonest first. */
export async function listPendingProposals() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('events')
    .select(
      `${proposalColumns}, description, governorate_code, ticket_url, is_free,
       proposer:accounts!events_proposed_by_fkey(display_name)` as const,
    )
    .eq('status', 'pending')
    .order('starts_at', { ascending: true });
  throwIf(error);
  return data ?? [];
}

/** The latest public note per event (the board's reason when it turns a proposal down). */
async function latestNotes(eventIds: string[]) {
  const notes = new Map<string, string>();
  if (eventIds.length === 0) return notes;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('review_events')
    .select('target_id, note_public, created_at')
    .eq('target_type', 'event')
    .in('target_id', eventIds)
    .not('note_public', 'is', null)
    .order('created_at', { ascending: false });
  throwIf(error);
  for (const row of data ?? []) {
    if (row.note_public && !notes.has(row.target_id)) notes.set(row.target_id, row.note_public);
  }
  return notes;
}
