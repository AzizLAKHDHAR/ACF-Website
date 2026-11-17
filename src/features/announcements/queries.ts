import 'server-only';
import { sessionClient, throwIfError } from '@/lib/supabase/session';

// The announcements feed as the signed-in user (RLS: their audience; members never see hidden
// items, the board sees them to manage them).

const announcementColumns =
  'id, title, body_md, source, audience, author_display, pinned, published_at, edited_at, hidden_at, author:accounts(display_name)' as const;

/** The feed: visible announcements, pinned first, newest first. */
export async function listAnnouncements(limit = 50) {
  const supabase = await sessionClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('announcements')
    .select(announcementColumns)
    .is('hidden_at', null)
    .lte('published_at', new Date().toISOString())
    .order('pinned', { ascending: false })
    .order('published_at', { ascending: false })
    .limit(limit);
  throwIfError(error);
  return data ?? [];
}

/** Everything the board manages, hidden items included, newest first. */
export async function listAllAnnouncements(limit = 100) {
  const supabase = await sessionClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('announcements')
    .select(announcementColumns)
    .order('published_at', { ascending: false })
    .limit(limit);
  throwIfError(error);
  return data ?? [];
}
