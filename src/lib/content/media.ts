import { publicEnv } from '@/lib/env';

/** Public URL of a file in the `public-media` bucket, or null when there is no file or no database. */
export function publicMediaUrl(path: string | null | undefined): string | null {
  const base = publicEnv.NEXT_PUBLIC_SUPABASE_URL;
  if (!path || !base) return null;
  return `${base}/storage/v1/object/public/public-media/${path.split('/').map(encodeURIComponent).join('/')}`;
}
