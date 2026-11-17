import { describe, expect, it } from 'vitest';
import { buildResults } from './results';

const collator = new Intl.Collator('fr');
const vote = (user_id: string, name: string, value: 'yes' | 'maybe' | 'no') => ({
  user_id,
  value,
  account: { display_name: name },
});

describe('buildResults', () => {
  it('builds one row per voter, sorted by name, with totals per option', () => {
    const results = buildResults(
      [
        { id: 'sat', poll_votes: [vote('u2', 'Zied', 'yes'), vote('u1', 'Amel', 'maybe')] },
        { id: 'sun', poll_votes: [vote('u1', 'Amel', 'yes'), vote('u2', 'Zied', 'no')] },
      ],
      collator,
    );
    expect(results.voters.map((voter) => voter.name)).toEqual(['Amel', 'Zied']);
    expect(results.voters[0]?.votes).toEqual({ sat: 'maybe', sun: 'yes' });
    expect(results.totals.sat).toEqual({ yes: 1, maybe: 1, no: 0 });
    expect(results.totals.sun).toEqual({ yes: 1, maybe: 0, no: 1 });
  });

  it('picks the options with the most yes, then the most maybe', () => {
    const results = buildResults(
      [
        { id: 'a', poll_votes: [vote('u1', 'A', 'yes'), vote('u2', 'B', 'maybe')] },
        { id: 'b', poll_votes: [vote('u1', 'A', 'yes'), vote('u2', 'B', 'no')] },
        { id: 'c', poll_votes: [vote('u1', 'A', 'yes'), vote('u2', 'B', 'maybe')] },
      ],
      collator,
    );
    expect(results.best).toEqual(['a', 'c']);
  });

  it('has no best option while nobody said yes or maybe', () => {
    const results = buildResults(
      [
        { id: 'a', poll_votes: [vote('u1', 'A', 'no')] },
        { id: 'b', poll_votes: [] },
      ],
      collator,
    );
    expect(results.best).toEqual([]);
    expect(results.totals.b).toEqual({ yes: 0, maybe: 0, no: 0 });
  });

  it('keeps voters whose account is gone, with an empty name', () => {
    const results = buildResults(
      [{ id: 'a', poll_votes: [{ user_id: 'u9', value: 'yes', account: null }] }],
      collator,
    );
    expect(results.voters).toEqual([{ userId: 'u9', name: '', votes: { a: 'yes' } }]);
  });
});
