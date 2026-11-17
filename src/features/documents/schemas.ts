import { z } from 'zod';
import { audience, id, optionalText, requiredText } from '@/lib/forms/schemas';
import { documentMimeTypes, LIBRARY_PATH, MAX_DOCUMENT_BYTES } from './files';

// The document library (roles.md §3): the board uploads, members read their audience's documents.

export const documentRecordSchema = z.object({
  path: z.string().regex(LIBRARY_PATH, 'required'),
  title: requiredText(200),
  category: optionalText(80),
  audience,
  mimeType: z.enum(documentMimeTypes, 'required'),
  size: z.number().int().min(1).max(MAX_DOCUMENT_BYTES),
});
export type DocumentRecordInput = z.input<typeof documentRecordSchema>;

export const documentIdSchema = z.object({ documentId: id });
