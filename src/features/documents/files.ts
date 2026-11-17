// What the document library accepts, mirroring the member-documents bucket (20261004230700_storage:
// 20 MB, these types). The bucket enforces it again; this only gives a quick, localized answer.

export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;

export const documentTypes = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'text/plain': 'txt',
  'text/markdown': 'md',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.oasis.opendocument.text': 'odt',
  'application/vnd.oasis.opendocument.spreadsheet': 'ods',
} as const;
export type DocumentMimeType = keyof typeof documentTypes;
export const documentMimeTypes = Object.keys(documentTypes) as [
  DocumentMimeType,
  ...DocumentMimeType[],
];

const byExtension: Record<string, DocumentMimeType> = {
  ...Object.fromEntries(
    Object.entries(documentTypes).map(([type, extension]) => [extension, type as DocumentMimeType]),
  ),
  jpeg: 'image/jpeg',
  markdown: 'text/markdown',
};

/** The file's type, from the browser or (when it reports none, e.g. `.md`) from its extension. */
export function documentMimeType(file: { name: string; type: string }): DocumentMimeType | null {
  if (file.type in documentTypes) return file.type as DocumentMimeType;
  if (file.type && file.type !== 'application/octet-stream') return null;
  const extension = /\.([a-z0-9]+)$/i.exec(file.name)?.[1]?.toLowerCase();
  return extension ? (byExtension[extension] ?? null) : null;
}

export function checkDocumentFile(file: {
  name: string;
  type: string;
  size: number;
}): 'ok' | 'fileType' | 'fileTooLarge' | 'empty' {
  if (!documentMimeType(file)) return 'fileType';
  if (file.size === 0) return 'empty';
  if (file.size > MAX_DOCUMENT_BYTES) return 'fileTooLarge';
  return 'ok';
}

/**
 * A storage-safe file name: accents dropped, anything but Latin letters, digits, dots, dashes and
 * underscores becomes a dash, at most 100 characters, extension kept (`document` when nothing is left).
 */
export function safeFileName(name: string): string {
  const match = /^(.*?)(\.[a-z0-9]{1,10})?$/i.exec(name.trim());
  const extension = (match?.[2] ?? '').toLowerCase();
  const base = (match?.[1] ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[._-]+|[._-]+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 100 - extension.length)
    .replace(/[._-]+$/, '');
  return `${base || 'document'}${extension}`;
}

/** `library/{upload id}/{safe name}`: the only paths the record action accepts. */
export const LIBRARY_PATH = /^library\/[0-9a-f-]{36}\/[a-z0-9][a-z0-9._-]{0,99}$/;

export function libraryPath(uploadId: string, fileName: string): string {
  return `library/${uploadId}/${safeFileName(fileName)}`;
}

/** "1.2 MB" style sizes, in the page's language. */
export function formatFileSize(bytes: number, locale: string): string {
  const units = ['byte', 'kilobyte', 'megabyte'] as const;
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: units[unit],
    unitDisplay: 'short',
    maximumFractionDigits: unit === 0 ? 0 : 1,
  }).format(value);
}
