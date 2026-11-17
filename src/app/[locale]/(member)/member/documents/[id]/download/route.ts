import { notFound } from 'next/navigation';
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards';
import { id as idSchema } from '@/lib/forms/schemas';
import { resolveLocaleParam } from '@/lib/i18n-params';
import { createClient } from '@/lib/supabase/server';

// Library files are never public: this route checks the member's access (layouts don't guard route
// handlers, so it calls requireRole itself), then answers with a redirect to a signed URL that
// expires quickly (architecture §6 → Storage buckets). RLS decides twice: on the documents row,
// and on the storage object when the URL is signed.
const SIGNED_URL_SECONDS = 60;

export async function GET(
  _request: Request,
  { params }: RouteContext<'/[locale]/member/documents/[id]/download'>,
) {
  await resolveLocaleParam(params);
  const { id } = await params;
  await requireRole('member', { returnTo: '/member/documents' });
  if (!idSchema.safeParse(id).success) notFound();

  const supabase = await createClient();
  const { data: document, error } = await supabase
    .from('documents')
    .select('storage_path')
    .eq('id', id)
    .eq('collection', 'library')
    .maybeSingle();
  if (error || !document) notFound();

  const { data: signed, error: signError } = await supabase.storage
    .from('member-documents')
    .createSignedUrl(document.storage_path, SIGNED_URL_SECONDS, { download: true });
  if (signError || !signed) notFound();

  return NextResponse.redirect(signed.signedUrl, {
    status: 303,
    headers: { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' },
  });
}
