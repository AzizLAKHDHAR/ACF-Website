import { describe, expect, it } from 'vitest';
import { isSafeExternalUrl, toEmbed } from './embeds';

describe('toEmbed', () => {
  it('builds no-cookie YouTube embeds', () => {
    expect(toEmbed('https://www.youtube.com/watch?v=demo0000000')).toEqual({
      provider: 'youtube',
      src: 'https://www.youtube-nocookie.com/embed/demo0000000',
    });
    expect(toEmbed('https://youtu.be/demo0000000')?.src).toBe(
      'https://www.youtube-nocookie.com/embed/demo0000000',
    );
  });

  it('builds Spotify and SoundCloud embeds', () => {
    expect(toEmbed('https://open.spotify.com/album/1A2B3C4D5E6F7G8H9I0J')?.src).toBe(
      'https://open.spotify.com/embed/album/1A2B3C4D5E6F7G8H9I0J',
    );
    expect(toEmbed('https://soundcloud.com/some-band/some-track')?.src).toBe(
      'https://w.soundcloud.com/player/?url=https%3A%2F%2Fsoundcloud.com%2Fsome-band%2Fsome-track',
    );
  });

  it('refuses everything else', () => {
    for (const url of [
      'http://www.youtube.com/watch?v=demo0000000',
      'https://www.youtube.com/watch?v=bad',
      'https://evil.example/watch?v=demo0000000',
      'javascript:alert(1)',
      'not a url',
      'https://open.spotify.com/album/../../x',
    ]) {
      expect(toEmbed(url), url).toBeNull();
    }
  });
});

describe('isSafeExternalUrl', () => {
  it('accepts http(s) only', () => {
    expect(isSafeExternalUrl('https://example.org')).toBe(true);
    expect(isSafeExternalUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeExternalUrl('data:text/html,x')).toBe(false);
    expect(isSafeExternalUrl(42)).toBe(false);
  });
});
