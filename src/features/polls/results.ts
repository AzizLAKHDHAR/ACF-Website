import type { PollVoteValue } from './schemas';

// The results grid of an availability poll: one row per voter, one column per option, and the
// totals that show which slots suit the most people. Pure, so it is unit-tested.

type VoteRow = {
  user_id: string;
  value: PollVoteValue;
  account: { display_name: string } | null;
};
type OptionRow = { id: string; poll_votes: VoteRow[] };

export type Tally = Record<PollVoteValue, number>;

export type PollResults = {
  voters: { userId: string; name: string; votes: Partial<Record<string, PollVoteValue>> }[];
  totals: Record<string, Tally>;
  /** Options with the most "yes" (then the most "maybe"); empty while nobody has said yes or maybe. */
  best: string[];
};

export function buildResults(options: readonly OptionRow[], collator: Intl.Collator): PollResults {
  const voters = new Map<string, PollResults['voters'][number]>();
  const totals: Record<string, Tally> = {};
  for (const option of options) {
    const tally: Tally = { yes: 0, maybe: 0, no: 0 };
    for (const vote of option.poll_votes) {
      tally[vote.value] += 1;
      const voter = voters.get(vote.user_id) ?? {
        userId: vote.user_id,
        name: vote.account?.display_name ?? '',
        votes: {},
      };
      voter.votes[option.id] = vote.value;
      voters.set(vote.user_id, voter);
    }
    totals[option.id] = tally;
  }

  const scores = options.map((option) => {
    const tally = totals[option.id] ?? { yes: 0, maybe: 0, no: 0 };
    return { id: option.id, score: tally.yes * 1000 + tally.maybe };
  });
  const top = Math.max(0, ...scores.map((entry) => entry.score));
  const best =
    top === 0 ? [] : scores.filter((entry) => entry.score === top).map((entry) => entry.id);

  return {
    voters: [...voters.values()].sort((a, b) => collator.compare(a.name, b.name)),
    totals,
    best,
  };
}
