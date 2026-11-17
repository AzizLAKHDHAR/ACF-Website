import { describe, expect, it } from 'vitest';
import { slugify, slugOrFallback, SLUG_PATTERN } from './slug';

describe('slugify', () => {
  it('folds accents and collapses punctuation', () => {
    expect(slugify('Soirée Jazz — Tunis!')).toBe('soiree-jazz-tunis');
    expect(slugify('  Les   Pixels (démo) ')).toBe('les-pixels-demo');
    expect(slugify('Œuvre & Cœur')).toBe('oeuvre-coeur');
  });

  it('always matches the database pattern or is empty', () => {
    for (const input of ['---', 'A_B', 'ça', '2026 festival', 'x'.repeat(200)]) {
      const slug = slugify(input);
      expect(slug === '' || SLUG_PATTERN.test(slug)).toBe(true);
      expect(slug.length).toBeLessThanOrEqual(80);
    }
  });

  it('returns nothing for Arabic-only names', () => {
    expect(slugify('الأمواج')).toBe('');
  });
});

describe('slugOrFallback', () => {
  it('uses the name when it has Latin letters', () => {
    expect(slugOrFallback('Studio Écho', 'studio', () => 'abc123')).toBe('studio-echo');
  });

  it('falls back to prefix and random part for non-Latin names', () => {
    expect(slugOrFallback('فرقة الأمواج', 'artist', () => 'abc123')).toBe('artist-abc123');
  });
});
