import { describe, expect, it } from 'vitest';
import { getDirection, intlLocale } from './locale';
import { routing } from './routing';

describe('locales', () => {
  it('reads Arabic right to left and the others left to right', () => {
    expect(getDirection('ar')).toBe('rtl');
    expect(getDirection('fr')).toBe('ltr');
    expect(getDirection('en')).toBe('ltr');
  });

  it('uses always-prefixed URLs and a persistent locale cookie', () => {
    expect(routing.locales).toEqual(['ar', 'fr', 'en']);
    expect(routing.defaultLocale).toBe('fr');
    expect(routing.localePrefix).toBe('always');
    expect(routing.localeCookie).toMatchObject({ maxAge: 60 * 60 * 24 * 365 });
  });

  it('formats Tunisian dinars with three decimals in every locale', () => {
    for (const locale of routing.locales) {
      const formatted = new Intl.NumberFormat(intlLocale[locale], {
        style: 'currency',
        currency: 'TND',
      }).format(1234.567);
      expect(formatted.replace(/\D/g, '')).toContain('1234567');
    }
  });
});
