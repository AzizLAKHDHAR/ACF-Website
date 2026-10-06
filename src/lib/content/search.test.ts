import { describe, expect, it } from 'vitest';
import { toPrefixTsQuery } from './search';

describe('toPrefixTsQuery', () => {
  it('builds prefix terms', () => {
    expect(toPrefixTsQuery('Pix')).toBe('pix:*');
    expect(toPrefixTsQuery('les  pixels')).toBe('les:* & pixels:*');
  });

  it('normalizes Arabic like the database and strips Latin accents', () => {
    expect(toPrefixTsQuery('الأمواج')).toBe('الامواج:*');
    expect(toPrefixTsQuery('الامواج')).toBe('الامواج:*');
    expect(toPrefixTsQuery('مُوسيقى')).toBe('موسيقي:*');
    expect(toPrefixTsQuery('مدرسة')).toBe('مدرسه:*');
    expect(toPrefixTsQuery('Écho')).toBe('echo:*');
  });

  it('drops tsquery operators and empty input', () => {
    expect(toPrefixTsQuery("a & b | !c:*'")).toBe('a:* & b:* & c:*');
    expect(toPrefixTsQuery('  !!! ')).toBeNull();
    expect(toPrefixTsQuery(undefined)).toBeNull();
  });

  it('caps the number of terms', () => {
    expect(toPrefixTsQuery('a b c d e f g h')?.split(' & ')).toHaveLength(6);
  });
});
