import { z } from 'zod';
import { audience, id, optionalTunisDateTime, requiredText } from '@/lib/forms/schemas';
import type { Database } from '@/types/database';

// Availability polls (roles.md §3): the board proposes time slots, members answer yes/maybe/no per
// slot until the poll closes (the database refuses votes after `closes_at`).

export type PollVoteValue = Database['public']['Enums']['poll_vote_value'];
export const pollVoteValues = ['yes', 'maybe', 'no'] as const satisfies readonly PollVoteValue[];

export const MAX_POLL_OPTIONS = 6;
export const MIN_POLL_OPTIONS = 2;

/** Option rows posted as `options.{i}.label|startsAt|endsAt` (so field errors land on the right input). */
function withOptionRows(input: unknown): unknown {
  if (!input || typeof input !== 'object') return input;
  const record = input as Record<string, unknown>;
  const options = Array.from({ length: MAX_POLL_OPTIONS }, (_, index) => ({
    label: record[`options.${index}.label`] ?? '',
    startsAt: record[`options.${index}.startsAt`] ?? '',
    endsAt: record[`options.${index}.endsAt`] ?? '',
  }));
  return { ...record, options };
}

const optionRow = z.object({
  label: z.string().trim().max(120, 'tooLong'),
  startsAt: optionalTunisDateTime(),
  endsAt: optionalTunisDateTime(),
});

export const pollSchema = z.preprocess(
  withOptionRows,
  z
    .object({
      title: requiredText(200),
      description: z.string().trim().max(5000, 'tooLong').default(''),
      audience,
      closesAt: optionalTunisDateTime({ future: true }),
      options: z.array(optionRow),
    })
    .superRefine((value, context) => {
      value.options.forEach((option, index) => {
        if (option.endsAt && !option.startsAt)
          context.addIssue({
            code: 'custom',
            path: ['options', index, 'startsAt'],
            message: 'required',
          });
        if (option.endsAt && option.startsAt && option.endsAt < option.startsAt)
          context.addIssue({
            code: 'custom',
            path: ['options', index, 'endsAt'],
            message: 'endBeforeStart',
          });
      });
      const filled = value.options.filter((option) => option.label || option.startsAt);
      if (filled.length < MIN_POLL_OPTIONS)
        context.addIssue({ code: 'custom', path: ['options'], message: 'optionsRequired' });
    })
    .transform((value) => ({
      ...value,
      options: value.options.filter((option) => option.label || option.startsAt),
    })),
);

/** Votes posted as `vote.{optionId}` = yes | maybe | no; an empty value withdraws the answer. */
export const voteSchema = z.preprocess(
  (input) => {
    if (!input || typeof input !== 'object') return input;
    const record = input as Record<string, unknown>;
    const votes: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(record)) {
      if (key.startsWith('vote.') && value) votes[key.slice('vote.'.length)] = value;
    }
    return { pollId: record.pollId, votes };
  },
  z.object({
    pollId: id,
    votes: z.record(id, z.enum(pollVoteValues, 'required')),
  }),
);

export const pollIdSchema = z.object({ pollId: id });
