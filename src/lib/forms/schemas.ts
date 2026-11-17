import { z } from 'zod';
import { tunisLocalToIso } from '@/lib/content/format';
import { audiences, type Audience } from './audience';

// Zod pieces shared by the forms (phase 4 onwards). Messages are keys under `forms.fieldErrors`; the
// database re-checks everything (constraints, RLS, RPCs).

/** An absolute http(s) address. */
export const httpUrl = z
  .string()
  .trim()
  .max(300, 'tooLong')
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' || url.protocol === 'http:';
    } catch {
      return false;
    }
  }, 'invalidUrl');

/** Any 8-4-4-4-12 id (the seed's readable ids don't follow the RFC variant bits). */
export const id = z.guid('required');

export const requiredText = (max: number) =>
  z.string('required').trim().min(1, 'required').max(max, 'tooLong');

export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, 'tooLong')
    .optional()
    .transform((value) => (value ? value : null));

export const checkbox = z.preprocess((value) => value === 'on' || value === 'true', z.boolean());

export { audiences, type Audience };
export const audience = z.enum(audiences, 'required');

export const optionalUrl = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : null))
  .pipe(httpUrl.nullable());

function toInstant(value: string, future: boolean): string | null {
  const iso = tunisLocalToIso(value);
  if (!iso || (future && new Date(iso).getTime() < Date.now())) return null;
  return iso;
}

/** A `datetime-local` value read as Tunis wall-clock time, as an ISO instant. */
export function tunisDateTime({ future = false }: { future?: boolean } = {}) {
  return z
    .string('required')
    .trim()
    .transform((value, context) => {
      const iso = toInstant(value, future);
      if (!iso) {
        context.addIssue({ code: 'custom', message: value ? 'invalidDate' : 'required' });
        return z.NEVER;
      }
      return iso;
    });
}

/** Same as `tunisDateTime`, but an empty value is null. */
export function optionalTunisDateTime({ future = false }: { future?: boolean } = {}) {
  return z
    .string()
    .trim()
    .optional()
    .transform((value, context) => {
      if (!value) return null;
      const iso = toInstant(value, future);
      if (!iso) {
        context.addIssue({ code: 'custom', message: 'invalidDate' });
        return z.NEVER;
      }
      return iso;
    });
}
