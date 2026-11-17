import { z } from 'zod';
import { localeMapFrom } from '@/features/profiles/schemas';
import { id, tunisDateTime } from '@/lib/forms/schemas';

// Volunteer shifts (roles.md §3): members sign themselves up (the database keeps each shift within
// its capacity, even under concurrent sign-ups); the board creates shifts and manages sign-ups.

export const MAX_SHIFT_CAPACITY = 200;

export const shiftSchema = z
  .object({
    eventId: z
      .string()
      .optional()
      .transform((value) => (value ? value : null))
      .pipe(id.nullable()),
    role_ar: z.string().trim().max(120, 'tooLong').optional(),
    role_fr: z.string().trim().max(120, 'tooLong').optional(),
    role_en: z.string().trim().max(120, 'tooLong').optional(),
    startsAt: tunisDateTime({ future: true }),
    endsAt: tunisDateTime(),
    capacity: z.preprocess(
      (value) => (value === '' || value === undefined ? undefined : Number(value)),
      z
        .number('required')
        .int('invalidNumber')
        .min(1, 'invalidNumber')
        .max(MAX_SHIFT_CAPACITY, 'invalidNumber'),
    ),
  })
  .transform((value) => ({ ...value, roleLabel: localeMapFrom(value, 'role') }))
  .superRefine((value, context) => {
    if (Object.keys(value.roleLabel).length === 0)
      context.addIssue({ code: 'custom', path: ['role_fr'], message: 'oneLocaleRequired' });
    if (value.endsAt <= value.startsAt)
      context.addIssue({ code: 'custom', path: ['endsAt'], message: 'endBeforeStart' });
  });

export const shiftIdSchema = z.object({ shiftId: id });
export const signupIdSchema = z.object({ signupId: id });
