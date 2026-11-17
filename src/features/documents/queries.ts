import 'server-only';
import { sessionClient, throwIfError } from '@/lib/supabase/session';

// The document library as the signed-in user (RLS: documents of their audience). Files are only
// ever handed out as short-lived signed URLs, by the download route.

export async function listLibraryDocuments() {
  const supabase = await sessionClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('documents')
    .select(
      'id, title, category, mime_type, size_bytes, audience, created_at, uploader:accounts(display_name)',
    )
    .eq('collection', 'library')
    .is('archived_at', null)
    .order('created_at', { ascending: false });
  throwIfError(error);
  return data ?? [];
}
