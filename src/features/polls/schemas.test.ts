import { describe, expect, it } from 'vitest';
import { invalid } from '@/lib/forms/state';
import { pollSchema, voteSchema } from './schemas';

const OPTION = '00000000-0000-4000-f000-000000000011';
const OTHER = '00000000-0000-4000-f000-000000000012';
const POLL = '00000000-0000-4000-f000-000000000001';

function future(days: number): string {
  const date = new Date(Date.now() + days * 86_400_000);
  // datetime-local in Tunis time (UTC+1): shift and drop the zone.
  return new Date(date.getTime() + 3_600_000).toISOString().slice(0, 16);
}

describe('pollSchema', () => {
  const base = { title: 'Répétition', audience: 'member' };

  it('keeps the filled slots, in order, and drops empty rows', () => {
    const parsed = pollSchema.parse({
      ...base,
      'options.0.startsAt': future(3),
      'options.1.label': 'Dimanche soir',
      'options.2.label': '',
    });
    expect(parsed.options).toHaveLength(2);
    expect(parsed.options[0]?.startsAt).toMatch(/Z$/);
    expect(parsed.options[1]).toEqual({ label: 'Dimanche soir', startsAt: null, endsAt: null });
  });

  it('needs at least two slots', () => {
    const result = pollSchema.safeParse({ ...base, 'options.0.label': 'Samedi' });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(invalid(result.error)).toMatchObject({ fields: { options: 'optionsRequired' } });
  });

  it('puts slot errors on the slot field', () => {
    const result = pollSchema.safeParse({
      ...base,
      'options.0.startsAt': future(3),
      'options.0.endsAt': future(2),
      'options.1.endsAt': future(4),
    });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(invalid(result.error)).toMatchObject({
        fields: { 'options.0.endsAt': 'endBeforeStart', 'options.1.startsAt': 'required' },
      });
  });

  it('refuses a closing date in the past', () => {
    const result = pollSchema.safeParse({
      ...base,
      closesAt: '2020-01-01T10:00',
      'options.0.label': 'A',
      'options.1.label': 'B',
    });
    expect(result.success).toBe(false);
  });
});

describe('voteSchema', () => {
  it('collects vote.{option} fields and drops empty answers', () => {
    expect(
      voteSchema.parse({
        pollId: POLL,
        [`vote.${OPTION}`]: 'yes',
        [`vote.${OTHER}`]: '',
        locale: 'fr',
      }),
    ).toEqual({ pollId: POLL, votes: { [OPTION]: 'yes' } });
  });

  it('refuses unknown answers and malformed option ids', () => {
    expect(voteSchema.safeParse({ pollId: POLL, [`vote.${OPTION}`]: 'perhaps' }).success).toBe(
      false,
    );
    expect(voteSchema.safeParse({ pollId: POLL, 'vote.not-an-id': 'yes' }).success).toBe(false);
  });
});
