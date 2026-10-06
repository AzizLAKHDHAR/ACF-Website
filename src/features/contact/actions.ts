'use server';

import { headers } from 'next/headers';
import { formDataToObject, type FieldErrorKey } from '@/features/auth/schemas';
import { contactSchema, type ContactFormState } from './schemas';
import { isContactConfigured, sendContactEmail, verifyTurnstile } from './send';

// The contact form is the one public, anonymous Server Action (no requireUser: anyone may write to
// the association). It stores nothing and only ever emails the fixed CONTACT_EMAIL_TO address, so
// the visitor controls the content of one message, never its recipient (D-064).
export async function sendContactMessage(
  _state: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const parsed = contactSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    const fields: Partial<Record<string, FieldErrorKey>> = {};
    for (const issue of parsed.error.issues)
      fields[String(issue.path[0] ?? 'form')] ??= issue.message as FieldErrorKey;
    return { ok: false, error: 'invalidInput', fields };
  }
  if (!isContactConfigured()) return { ok: false, error: 'unavailable' };
  // A filled honeypot gets the success answer, so bots learn nothing.
  if (parsed.data.website) return { ok: true, data: { sent: true } };

  const requestHeaders = await headers();
  const ip = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  if (!(await verifyTurnstile(parsed.data.captchaToken, ip)))
    return { ok: false, error: 'captcha' };

  const sent = await sendContactEmail(parsed.data);
  return sent ? { ok: true, data: { sent: true } } : { ok: false, error: 'failed' };
}
