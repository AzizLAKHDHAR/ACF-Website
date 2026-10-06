/**
 * Recognizes music/video links that can be embedded, and builds the iframe URL. Nothing is loaded until
 * the visitor clicks (privacy and performance; roadmap phase 3). YouTube uses the no-cookie domain.
 * Anything not recognized stays a plain link.
 */
export type Embed = { provider: 'youtube' | 'spotify' | 'soundcloud'; src: string };

export function toEmbed(rawUrl: string): Embed | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  const host = url.hostname.replace(/^www\.|^m\./, '');

  if (host === 'youtube.com' || host === 'youtu.be') {
    const id = host === 'youtu.be' ? url.pathname.slice(1) : url.searchParams.get('v');
    return id && /^[\w-]{11}$/.test(id)
      ? { provider: 'youtube', src: `https://www.youtube-nocookie.com/embed/${id}` }
      : null;
  }
  if (host === 'open.spotify.com') {
    const match =
      /^\/(?:intl-[a-z-]+\/)?(track|album|artist|playlist|episode|show)\/([A-Za-z0-9]{10,40})$/.exec(
        url.pathname,
      );
    return match
      ? { provider: 'spotify', src: `https://open.spotify.com/embed/${match[1]}/${match[2]}` }
      : null;
  }
  if (host === 'soundcloud.com') {
    return /^\/[\w-]+(\/[\w-]+)*$/.test(url.pathname)
      ? {
          provider: 'soundcloud',
          src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(`https://soundcloud.com${url.pathname}`)}`,
        }
      : null;
  }
  return null;
}

/** Safe external link: http(s) only. */
export function isSafeExternalUrl(rawUrl: unknown): boolean {
  if (typeof rawUrl !== 'string') return false;
  try {
    const { protocol } = new URL(rawUrl);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}
