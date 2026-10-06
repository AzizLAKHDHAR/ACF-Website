import { describe, expect, it } from 'vitest';
import { localized, localizedText } from './localized';

describe('localized', () => {
  it('returns the requested locale when present', () => {
    expect(localized({ ar: 'روك', fr: 'Rock', en: 'Rock!' }, 'ar')).toEqual({
      text: 'روك',
      locale: 'ar',
    });
  });

  it('falls back requested → fr → ar → en', () => {
    expect(localized({ ar: 'عربي', en: 'English' }, 'en')).toEqual({
      text: 'English',
      locale: 'en',
    });
    expect(localized({ ar: 'عربي', en: 'English' }, 'fr')).toEqual({ text: 'عربي', locale: 'ar' });
    expect(localized({ fr: 'Français', en: 'English' }, 'ar')).toEqual({
      text: 'Français',
      locale: 'fr',
    });
    expect(localized({ en: 'English' }, 'ar')).toEqual({ text: 'English', locale: 'en' });
  });

  it('skips blank strings and tolerates bad input', () => {
    expect(localized({ fr: '  ', ar: 'عربي' }, 'fr')?.locale).toBe('ar');
    expect(localized(null, 'fr')).toBeNull();
    expect(localized(['fr'], 'fr')).toBeNull();
    expect(localizedText({}, 'fr')).toBe('');
  });
});
