import 'server-only';
import { cache } from 'react';
import { sessionClient, throwIfError } from '@/lib/supabase/session';

// Polls as the signed-in user (RLS: their audience). Votes are visible to everyone who sees the
// poll, which is what the results grid shows.

export function isPollOpen(poll: { closes_at: string | null }, now = Date.now()): boolean {
  return !poll.closes_at || new Date(poll.closes_at).getTime() > now;
}

/** Polls, newest first, with whether the user has answered and how many people did. */
export async function listPolls(userId: string) {
  const supabase = await sessionClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('polls')
    .select(
      'id, title, kind, audience, closes_at, created_at, poll_options(id, poll_votes(user_id))',
    )
    .order('created_at', { ascending: false });
  throwIfError(error);
  return (data ?? []).map(({ poll_options, ...poll }) => {
    const voters = new Set(poll_options.flatMap((o) => o.poll_votes.map((v) => v.user_id)));
    return { ...poll, open: isPollOpen(poll), answered: voters.has(userId), voters: voters.size };
  });
}

export const getPoll = cache(async (pollId: string) => {
  const supabase = await sessionClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('polls')
    .select(
      `id, title, description_md, kind, audience, closes_at, created_at,
       poll_options(id, label, starts_at, ends_at, position,
         poll_votes(user_id, value, account:accounts(display_name)))` as const,
    )
    .eq('id', pollId)
    .order('position', { referencedTable: 'poll_options', ascending: true })
    .order('starts_at', { referencedTable: 'poll_options', ascending: true })
    .maybeSingle();
  throwIfError(error);
  return data;
});
