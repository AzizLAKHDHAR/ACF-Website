// Supabase Auth error codes → keys under `auth.errors` in messages/*.json. Anything unknown is
// `generic`, so raw server messages never reach the page.
export const authErrorKeys = [
  'invalidInput',
  'invalidCredentials',
  'emailNotConfirmed',
  'weakPassword',
  'samePassword',
  'rateLimited',
  'captchaFailed',
  'sessionExpired',
  'generic',
] as const;
export type AuthErrorKey = (typeof authErrorKeys)[number];

const byCode: Record<string, AuthErrorKey> = {
  invalid_credentials: 'invalidCredentials',
  email_not_confirmed: 'emailNotConfirmed',
  weak_password: 'weakPassword',
  same_password: 'samePassword',
  over_email_send_rate_limit: 'rateLimited',
  over_request_rate_limit: 'rateLimited',
  captcha_failed: 'captchaFailed',
  session_not_found: 'sessionExpired',
  session_expired: 'sessionExpired',
  refresh_token_not_found: 'sessionExpired',
  validation_failed: 'invalidInput',
  email_address_invalid: 'invalidInput',
};

export function authErrorKey(
  error: { code?: string | undefined } | null | undefined,
): AuthErrorKey {
  return (error?.code && byCode[error.code]) || 'generic';
}

// Codes that would reveal whether an address has an account; the UI answers "check your email" anyway.
const enumerationCodes = new Set([
  'otp_disabled',
  'signup_disabled',
  'user_not_found',
  'user_already_exists',
]);

export function isAccountEnumerationError(
  error: { code?: string | undefined } | null | undefined,
): boolean {
  return Boolean(error?.code && enumerationCodes.has(error.code));
}
