import { z } from 'zod';
import { httpUrl, localeMapFrom, uuid } from '@/features/profiles/schemas';
import { tunisLocalToIso } from '@/lib/content/format';

// Event proposals by approved artists and venues, and the board's decision on them (roles.md §1).

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, 'tooLong')
    .optional()
    .transform((value) => (value ? value : null));

const localDateTime = z
  .string()
  .trim()
  .transform((value, context) => {
    const iso = tunisLocalToIso(value);
    if (!iso) {
      context.addIssue({ code: 'custom', message: value ? 'invalidDate' : 'required' });
      return z.NEVER;
    }
    return iso;
  });

export const proposeEventSchema = z
  .object({
    profileId: uuid,
    title_ar: z.string().trim().max(160, 'tooLong').optional(),
    title_fr: z.string().trim().max(160, 'tooLong').optional(),
    title_en: z.string().trim().max(160, 'tooLong').optional(),
    description_ar: z.string().trim().max(4000, 'tooLong').optional(),
    description_fr: z.string().trim().max(4000, 'tooLong').optional(),
    description_en: z.string().trim().max(4000, 'tooLong').optional(),
    startsAt: localDateTime,
    endsAt: z
      .string()
      .trim()
      .optional()
      .transform((value, context) => {
        if (!value) return null;
        const iso = tunisLocalToIso(value);
        if (!iso) {
          context.addIssue({ code: 'custom', message: 'invalidDate' });
          return z.NEVER;
        }
        return iso;
      }),
    venueText: optionalText(200),
    governorate: z
      .string()
      .optional()
      .transform((value) => (value ? value : null))
      .refine((value) => value === null || /^TN-[0-9]{2}$/.test(value), 'required'),
    ticketUrl: z
      .string()
      .trim()
      .optional()
      .transform((value) => (value ? value : null))
      .pipe(httpUrl.nullable()),
    isFree: z.preprocess((value) => value === 'on' || value === 'true', z.boolean()),
  })
  .transform((value) => ({
    ...value,
    title: localeMapFrom(value, 'title'),
    description: localeMapFrom(value, 'description'),
  }))
  .superRefine((value, context) => {
    if (Object.keys(value.title).length === 0)
      context.addIssue({ code: 'custom', path: ['title_fr'], message: 'oneLocaleRequired' });
    if (value.endsAt && value.endsAt < value.startsAt)
      context.addIssue({ code: 'custom', path: ['endsAt'], message: 'endBeforeStart' });
    if (new Date(value.startsAt).getTime() < Date.now())
      context.addIssue({ code: 'custom', path: ['startsAt'], message: 'invalidDate' });
  });

export const eventDecisionSchema = z
  .object({
    eventId: uuid,
    decision: z.enum(['published', 'unpublished'], 'required'),
    notePublic: optionalText(2000),
  })
  .refine((value) => value.decision === 'published' || value.notePublic, {
    path: ['notePublic'],
    message: 'required',
  });
