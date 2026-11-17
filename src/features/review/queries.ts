import 'server-only';
import { createClient } from '@/lib/supabase/server';

// Admin review reads. They use the admin's own session: RLS lets admins read every profile and the
// internal notes; nothing here needs the service-role key.

function throwIf(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

const queueColumns =
  'id, type, slug, status, display_name, tagline, governorate_code, avatar_path, submitted_at, updated_at' as const;

/** Profiles waiting for a decision (oldest submission first), and the suspended ones. */
export async function listReviewQueue() {
  const supabase = await createClient();
  const [pending, suspended] = await Promise.all([
    supabase
      .from('public_profiles')
      .select(queueColumns)
      .eq('status', 'pending')
      .order('submitted_at', { ascending: true }),
    supabase
      .from('public_profiles')
      .select(queueColumns)
      .eq('status', 'suspended')
      .order('updated_at', { ascending: false }),
  ]);
  throwIf(pending.error ?? suspended.error);
  return { pending: pending.data ?? [], suspended: suspended.data ?? [] };
}

/** Review history with internal notes (admin-only table, joined through RLS). */
export async function listReviewHistoryWithNotes(profileId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('review_events')
    .select('id, action, note_public, created_at, review_event_notes(note_internal)')
    .eq('target_type', 'profile')
    .eq('target_id', profileId)
    .order('created_at', { ascending: false });
  throwIf(error);
  return data ?? [];
}
