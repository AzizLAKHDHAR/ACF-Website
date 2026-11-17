import { describe, expect, it } from 'vitest';
import {
  formatDate,
  formatShortDate,
  startOfTodayInTunis,
  tunisDayStart,
  tunisLocalToIso,
} from './format';

describe('date formatting', () => {
  const instant = '2026-10-24T23:30:00Z'; // already the 25th in Tunis (UTC+1)

  it('uses the Tunis time zone', () => {
    expect(formatDate(instant, 'en')).toContain('October 25, 2026');
    expect(formatShortDate(instant, 'fr')).toContain('25');
  });

  it('formats in each locale', () => {
    expect(formatDate(instant, 'fr')).toMatch(/dimanche 25 octobre 2026/);
    expect(formatDate(instant, 'ar')).toMatch(/2026|٢٠٢٦/);
  });

  it('computes day boundaries in Tunis', () => {
    expect(tunisDayStart('2026-10-25')).toBe('2026-10-24T23:00:00.000Z');
    expect(startOfTodayInTunis(new Date(instant))).toBe('2026-10-24T23:00:00.000Z');
  });
});

describe('tunisLocalToIso', () => {
  it('reads the value as Tunis time (UTC+1)', () => {
    expect(tunisLocalToIso('2026-12-31T20:30')).toBe('2026-12-31T19:30:00.000Z');
    expect(tunisLocalToIso('2026-07-01T00:15')).toBe('2026-06-30T23:15:00.000Z');
  });

  it('rejects anything else', () => {
    expect(tunisLocalToIso('')).toBeNull();
    expect(tunisLocalToIso('2026-13-01T10:00')).toBeNull();
    expect(tunisLocalToIso('2026-12-31 20:30')).toBeNull();
  });
});
