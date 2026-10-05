import { z } from 'zod';
import { routing } from '@/i18n/routing';

// Messages are keys under `auth.fieldErrors` in messages/*.json, resolved by the form components.
export const fieldErrorKeys = [
  'required',
  'invalidEmail',
  'weakPassword',
  'tooLong',
  'mismatch',
] as const;
export type FieldErrorKey = (typeof fieldErrorKeys)[number];

const locale = z.enum(routing.locales);
const email = z
  .string()
  .trim()
  .min(1, 'required')
  .max(254, 'tooLong')
  .pipe(z.email('invalidEmail'));
// Mirrors supabase/config.toml: at least 8 characters with letters and digits.
const password = z
  .string()
  .min(8, 'weakPassword')
  .max(72, 'tooLong')
  .regex(/[A-Za-z]/, 'weakPassword')
  .regex(/[0-9]/, 'weakPassword');
const captchaToken = z.string().max(4096).optional();

/** A locale-less, same-site path such as `/member/tasks`; anything else falls back to `/account`. */
export function safeNextPath(value: unknown): string {
  if (typeof value !== 'string') return '/account';
  return /^\/(?!\/)[A-Za-z0-9\-_/]{0,200}$/.test(value) ? value : '/account';
}

export const signUpSchema = z.object({
  locale,
  displayName: z.string().trim().min(1, 'required').max(120, 'tooLong'),
  email,
  password,
  captchaToken,
});

export const signInSchema = z.object({
  locale,
  email,
  password: z.string().min(1, 'required').max(72, 'tooLong'),
  next: z.string().optional().transform(safeNextPath),
  captchaToken,
});

export const magicLinkSchema = z.object({
  locale,
  email,
  next: z.string().optional().transform(safeNextPath),
  captchaToken,
});

export const passwordResetRequestSchema = z.object({ locale, email, captchaToken });

export const newPasswordSchema = z
  .object({ locale, password, confirm: z.string() })
  .refine((value) => value.password === value.confirm, { message: 'mismatch', path: ['confirm'] });

export const signOutSchema = z.object({ locale });

/** Plain object from FormData, with Turnstile's implicit field renamed. */
export function formDataToObject(formData: FormData): Record<string, string> {
  const entries = Object.fromEntries(
    [...formData.entries()].filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
  const { ['cf-turnstile-response']: captcha, ...rest } = entries;
  return captcha ? { ...rest, captchaToken: captcha } : rest;
}
