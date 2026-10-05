import { describe, expect, it } from 'vitest';
import { authErrorKey, isAccountEnumerationError } from './errors';
import { formDataToObject, newPasswordSchema, safeNextPath, signUpSchema } from './schemas';

describe('safeNextPath', () => {
  it('keeps same-site, locale-less paths', () => {
    expect(safeNextPath('/member')).toBe('/member');
    expect(safeNextPath('/member/tasks')).toBe('/member/tasks');
  });

  it('rejects open redirects and odd input', () => {
    for (const value of [
      '//evil.example',
      'https://evil.example',
      '/\\evil',
      '/a?b=c',
      '/a#b',
      '',
      null,
      42,
    ]) {
      expect(safeNextPath(value)).toBe('/account');
    }
  });
});

describe('auth schemas', () => {
  const valid = { locale: 'ar', displayName: 'Demo', email: 'demo@acf.test', password: 'abcd1234' };

  it('accepts a valid sign-up', () => {
    expect(signUpSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects weak passwords and bad emails with message keys', () => {
    const weak = signUpSchema.safeParse({ ...valid, password: 'abcdefgh' });
    expect(weak.success ? [] : weak.error.issues.map((issue) => issue.message)).toContain(
      'weakPassword',
    );
    const email = signUpSchema.safeParse({ ...valid, email: 'not-an-email' });
    expect(email.success ? [] : email.error.issues.map((issue) => issue.message)).toContain(
      'invalidEmail',
    );
  });

  it('rejects unknown locales', () => {
    expect(signUpSchema.safeParse({ ...valid, locale: 'de' }).success).toBe(false);
  });

  it('requires matching passwords', () => {
    const result = newPasswordSchema.safeParse({
      locale: 'fr',
      password: 'abcd1234',
      confirm: 'abcd1235',
    });
    expect(result.success ? [] : result.error.issues.map((issue) => issue.message)).toEqual([
      'mismatch',
    ]);
  });

  it('maps the Turnstile field to captchaToken', () => {
    const form = new FormData();
    form.set('email', 'demo@acf.test');
    form.set('cf-turnstile-response', 'token');
    expect(formDataToObject(form)).toEqual({ email: 'demo@acf.test', captchaToken: 'token' });
  });
});

describe('auth errors', () => {
  it('maps known codes and hides unknown ones', () => {
    expect(authErrorKey({ code: 'invalid_credentials' })).toBe('invalidCredentials');
    expect(authErrorKey({ code: 'something_new' })).toBe('generic');
    expect(authErrorKey(null)).toBe('generic');
  });

  it('flags errors that would reveal whether an account exists', () => {
    expect(isAccountEnumerationError({ code: 'otp_disabled' })).toBe(true);
    expect(isAccountEnumerationError({ code: 'invalid_credentials' })).toBe(false);
  });
});
