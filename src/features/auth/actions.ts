'use server';

import { cookies } from 'next/headers';
import type { z } from 'zod';
import { redirect } from '@/i18n/navigation';
import { requireUser } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { NEXT_COOKIE } from './constants';
import { authErrorKey, isAccountEnumerationError, type AuthErrorKey } from './errors';
import {
  formDataToObject,
  magicLinkSchema,
  newPasswordSchema,
  passwordResetRequestSchema,
  signInSchema,
  signOutSchema,
  signUpSchema,
  type FieldErrorKey,
} from './schemas';

export type AuthNotice = 'checkEmail' | 'passwordUpdated';
export type AuthFormState =
  | { ok: true; data: { notice: AuthNotice } }
  | { ok: false; error: AuthErrorKey; fields?: Partial<Record<string, FieldErrorKey>> }
  | null;

function invalid(error: z.ZodError): AuthFormState {
  const fields: Partial<Record<string, FieldErrorKey>> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? 'form');
    fields[field] ??= issue.message as FieldErrorKey;
  }
  return { ok: false, error: 'invalidInput', fields };
}

// Sign-up: Supabase sends the confirmation email; the account row (with this locale) is created by
// the on_auth_user_created trigger. Existing addresses get the same answer (no account enumeration).
export async function signUp(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { email, password, displayName, locale, captchaToken } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName, locale }, captchaToken },
  });
  if (error && !isAccountEnumerationError(error)) return { ok: false, error: authErrorKey(error) };
  return { ok: true, data: { notice: 'checkEmail' } };
}

export async function signInWithPassword(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { email, password, next, locale, captchaToken } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
    options: { captchaToken },
  });
  if (error) return { ok: false, error: authErrorKey(error) };
  redirect({ href: next, locale });
  return null;
}

// Magic link for existing accounts only (sign-up stays explicit). Same answer whether or not the
// address has an account.
export async function sendMagicLink(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = magicLinkSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { email, next, captchaToken } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, captchaToken },
  });
  if (error && !isAccountEnumerationError(error)) return { ok: false, error: authErrorKey(error) };

  (await cookies()).set(NEXT_COOKIE, next, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60,
  });
  return { ok: true, data: { notice: 'checkEmail' } };
}

export async function requestPasswordReset(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = passwordResetRequestSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { email, captchaToken } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { captchaToken });
  if (error && !isAccountEnumerationError(error)) return { ok: false, error: authErrorKey(error) };
  return { ok: true, data: { notice: 'checkEmail' } };
}

// After a recovery link (or from account settings): the session comes from the cookies.
export async function updatePassword(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = newPasswordSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  await requireUser({ returnTo: '/reset-password' });

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, error: authErrorKey(error) };
  return { ok: true, data: { notice: 'passwordUpdated' } };
}

export async function signOut(formData: FormData): Promise<void> {
  const parsed = signOutSchema.safeParse(formDataToObject(formData));
  const locale = parsed.success ? parsed.data.locale : 'fr';
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect({ href: '/', locale });
}
