import type { z } from 'zod';

// The typed result every phase 4+ Server Action returns (CLAUDE.md → Server Action shape). Error,
// notice and field-error values are message keys under `forms.*` in messages/*.json.

export const formErrorKeys = [
  'invalidInput',
  'forbidden',
  'notFound',
  'slugTaken',
  'conflict',
  'invalidTransition',
  'incomplete',
  'unknownEmail',
  'alreadyManager',
  'lastOwner',
  'uploadFailed',
  'failed',
] as const;
export type FormErrorKey = (typeof formErrorKeys)[number];

export const formNoticeKeys = [
  'saved',
  'created',
  'submitted',
  'added',
  'removed',
  'deleted',
  'published',
  'unpublished',
  'approved',
  'rejected',
  'suspended',
  'reinstated',
  'proposed',
] as const;
export type FormNoticeKey = (typeof formNoticeKeys)[number];

export const fieldErrorKeys = [
  'required',
  'tooLong',
  'invalidSlug',
  'invalidUrl',
  'invalidEmail',
  'invalidNumber',
  'invalidDate',
  'endBeforeStart',
  'oneLocaleRequired',
] as const;
export type FieldErrorKey = (typeof fieldErrorKeys)[number];

export type FormState =
  | { ok: true; notice: FormNoticeKey; emailsSent?: number }
  | {
      ok: false;
      error: FormErrorKey;
      fields?: Partial<Record<string, FieldErrorKey>>;
      /** Missing items for `incomplete` (message keys under `forms.missing`). */
      missing?: string[];
    }
  | null;

export function ok(notice: FormNoticeKey, extra: { emailsSent?: number } = {}): FormState {
  return { ok: true, notice, ...extra };
}

export function fail(error: FormErrorKey, extra: { missing?: string[] } = {}): FormState {
  return { ok: false, error, ...extra };
}

/** Field errors from a failed Zod parse; the first issue per field wins. */
export function invalid(error: z.ZodError): FormState {
  const fields: Partial<Record<string, FieldErrorKey>> = {};
  for (const issue of error.issues) {
    const field = issue.path.map(String).join('.') || 'form';
    const key = (fieldErrorKeys as readonly string[]).includes(issue.message)
      ? (issue.message as FieldErrorKey)
      : 'required';
    fields[field] ??= key;
  }
  return { ok: false, error: 'invalidInput', fields };
}

type PostgrestLikeError = { code?: string; message?: string } | null | undefined;

/**
 * Maps a Postgres/PostgREST error to a form error. The database is the authority (RLS, RPC checks),
 * so its refusals are expected outcomes, not crashes: 42501 = not allowed, P0002 = not found,
 * P0001 = a refused state change, 23505 = a unique value already used.
 */
export function fromDbError(
  error: PostgrestLikeError,
  overrides: Partial<Record<string, FormErrorKey>> = {},
): FormState {
  const code = error?.code ?? '';
  const mapped: FormErrorKey | undefined =
    overrides[code] ??
    ({
      '42501': 'forbidden',
      P0002: 'notFound',
      P0001: 'invalidTransition',
      '23505': 'conflict',
      '23514': 'invalidInput',
      '22023': 'invalidInput',
      '22P02': 'invalidInput',
    } as Record<string, FormErrorKey>)[code];
  if (!mapped) console.error('[action] unexpected database error', code, error?.message);
  return { ok: false, error: mapped ?? 'failed' };
}

/** FormData → plain object; repeated keys (checkbox groups) become arrays. Files are dropped. */
export function formDataToRecord(formData: FormData): Record<string, string | string[]> {
  const record: Record<string, string | string[]> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value !== 'string' || key.startsWith('$ACTION')) continue;
    const existing = record[key];
    if (existing === undefined) record[key] = value;
    else record[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
  }
  return record;
}
