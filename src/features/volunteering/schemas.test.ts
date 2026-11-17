import { describe, expect, it } from 'vitest';
import { invalid } from '@/lib/forms/state';
import { shiftSchema } from './schemas';

function future(hours: number): string {
  // A datetime-local value in Tunis time (UTC+1).
  return new Date(Date.now() + (hours + 1) * 3_600_000).toISOString().slice(0, 16);
}

describe('shiftSchema', () => {
  const base = { startsAt: future(48), endsAt: future(51), capacity: '3' };

  it('builds the role label from the filled languages and reads the capacity', () => {
    const parsed = shiftSchema.parse({
      ...base,
      role_fr: ' Accueil ',
      role_ar: 'الاستقبال',
      role_en: '',
    });
    expect(parsed.roleLabel).toEqual({ ar: 'الاستقبال', fr: 'Accueil' });
    expect(parsed.capacity).toBe(3);
    expect(parsed.eventId).toBeNull();
  });

  it('needs a role in at least one language and an end after the start', () => {
    const result = shiftSchema.safeParse({ ...base, endsAt: future(47) });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(invalid(result.error)).toMatchObject({
        fields: { role_fr: 'oneLocaleRequired', endsAt: 'endBeforeStart' },
      });
  });

  it('refuses a capacity that is not a positive whole number', () => {
    for (const capacity of ['0', '-2', '1.5', 'abc', '']) {
      expect(shiftSchema.safeParse({ ...base, role_fr: 'Bar', capacity }).success, capacity).toBe(
        false,
      );
    }
  });

  it('refuses a malformed event id', () => {
    expect(shiftSchema.safeParse({ ...base, role_fr: 'Bar', eventId: 'x' }).success).toBe(false);
  });
});
