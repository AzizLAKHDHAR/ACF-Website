import { z } from 'zod';
import {
  audience,
  id,
  optionalText,
  optionalTunisDateTime,
  optionalUrl,
  requiredText,
  tunisDateTime,
} from '@/lib/forms/schemas';
import type { Database } from '@/types/database';

// Meetings and answers (roles.md §3): members answer for themselves, the board schedules meetings.

export type RsvpResponse = Database['public']['Enums']['rsvp_response'];
export const rsvpResponses = ['yes', 'maybe', 'no'] as const satisfies readonly RsvpResponse[];

export const answerMeetingSchema = z.object({
  meetingId: id,
  answer: z.enum(rsvpResponses, 'required'),
  note: optionalText(500),
});

export const meetingSchema = z
  .object({
    title: requiredText(200),
    description: z.string().trim().max(5000, 'tooLong').default(''),
    startsAt: tunisDateTime({ future: true }),
    endsAt: optionalTunisDateTime(),
    location: optionalText(200),
    onlineUrl: optionalUrl,
    audience,
  })
  .superRefine((value, context) => {
    if (value.endsAt && value.endsAt < value.startsAt)
      context.addIssue({ code: 'custom', path: ['endsAt'], message: 'endBeforeStart' });
  });

export const meetingIdSchema = z.object({ meetingId: id });
