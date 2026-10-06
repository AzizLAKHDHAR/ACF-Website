import { z } from 'zod';
import { routing } from '@/i18n/routing';
import type { FieldErrorKey } from '@/features/auth/schemas';

// Field errors reuse the `auth.fieldErrors` keys so the shared <Field> can display them.
const text = (max: number) =>
  z
    .string()
    .trim()
    .min(1, 'required' satisfies FieldErrorKey)
    .max(max, 'tooLong' satisfies FieldErrorKey);

export const contactSchema = z.object({
  locale: z.enum(routing.locales),
  name: text(120),
  email: z.string().trim().min(1, 'required').max(254, 'tooLong').pipe(z.email('invalidEmail')),
  subject: text(160),
  message: text(5000),
  // Honeypot: hidden from people, filled in by naive bots. Any value ⇒ silently dropped.
  website: z.string().max(500).optional(),
  captchaToken: z.string().max(4096).optional(),
});
export type ContactInput = z.infer<typeof contactSchema>;

export type ContactError = 'invalidInput' | 'unavailable' | 'captcha' | 'failed';
export type ContactFormState =
  | { ok: true; data: { sent: true } }
  | { ok: false; error: ContactError; fields?: Partial<Record<string, FieldErrorKey>> }
  | null;
