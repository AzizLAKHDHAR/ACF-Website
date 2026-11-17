'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/guards';
import { formDataToRecord, fromDbError, invalid, ok, type FormState } from '@/lib/forms/state';
import { createClient } from '@/lib/supabase/server';
import { documentIdSchema, documentRecordSchema } from './schemas';

function refresh() {
  revalidatePath('/[locale]/member', 'layout');
}

/**
 * Records a file the board just uploaded to member-documents (the bucket's policy only lets the
 * board write). The path is re-checked here; members can read the file once this row exists
 * (can_read_member_document matches the row by its path).
 */
export async function recordDocument(input: unknown): Promise<FormState> {
  const parsed = documentRecordSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  await requireRole('board');
  const value = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from('documents').insert({
    collection: 'library',
    audience: value.audience,
    title: value.title,
    category: value.category,
    storage_path: value.path,
    mime_type: value.mimeType,
    size_bytes: value.size,
  });
  if (error) return fromDbError(error);
  refresh();
  return ok('uploaded');
}

/**
 * Deletes a library document and its file. The file goes first: Storage only deletes objects the
 * caller can read, and the read policy needs the row (it matches the file by the row's path).
 */
export async function deleteDocument(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = documentIdSchema.safeParse(formDataToRecord(formData));
  if (!parsed.success) return invalid(parsed.error);
  await requireRole('board');
  const supabase = await createClient();
  const { data: document, error } = await supabase
    .from('documents')
    .select('storage_path')
    .eq('id', parsed.data.documentId)
    .eq('collection', 'library')
    .maybeSingle();
  if (error) return fromDbError(error);
  if (!document) return { ok: false, error: 'notFound' };
  const { error: storageError } = await supabase.storage
    .from('member-documents')
    .remove([document.storage_path]);
  if (storageError) {
    console.error('[documents] could not delete the file', storageError.message);
    return { ok: false, error: 'failed' };
  }
  const { data: deleted, error: deleteError } = await supabase
    .from('documents')
    .delete()
    .eq('id', parsed.data.documentId)
    .select('id');
  if (deleteError) return fromDbError(deleteError);
  if (!deleted?.length) return { ok: false, error: 'forbidden' };
  refresh();
  return ok('deleted');
}
