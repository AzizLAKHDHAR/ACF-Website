// Image upload rules shared by the browser (checks before uploading) and the tests. The public-media
// bucket enforces the same type list and a 5 MB ceiling server-side (storage migration).

export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
] as const;

/** Largest file people may pick: phone photos are big, and they are shrunk before upload. */
export const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
/** The bucket's own limit, checked again after resizing. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Longest side after resizing, per use. */
export const MAX_DIMENSION = { avatar: 800, cover: 1920, post: 1600 } as const;

export type ImageCheck = 'ok' | 'fileType' | 'fileTooLarge';

export function checkImageFile(file: { type: string; size: number }): ImageCheck {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) return 'fileType';
  if (file.size > MAX_SOURCE_BYTES) return 'fileTooLarge';
  return 'ok';
}

/** Scales `width × height` down (never up) so the longest side is at most `max`. */
export function fitWithin(width: number, height: number, max: number) {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}
