import 'server-only';
import { serverEnv } from '@/lib/env.server';
import type { ContactInput } from './schemas';

// Contact messages are forwarded by email and never stored (D-064): no table, no retention.

export function isContactConfigured(): boolean {
  return Boolean(serverEnv.RESEND_API_KEY && serverEnv.EMAIL_FROM && serverEnv.CONTACT_EMAIL_TO);
}

/** Cloudflare Turnstile siteverify. Skipped (true) when no secret is configured. */
export async function verifyTurnstile(
  token: string | undefined,
  remoteIp?: string | null,
): Promise<boolean> {
  const secret = serverEnv.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set('remoteip', remoteIp);
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    const result = (await response.json()) as { success?: unknown };
    return result.success === true;
  } catch {
    return false;
  }
}

/** Sends the message to the association through Resend's HTTP API. Reply-To is the visitor. */
export async function sendContactEmail(input: ContactInput): Promise<boolean> {
  const { RESEND_API_KEY, RESEND_API_URL, EMAIL_FROM, CONTACT_EMAIL_TO } = serverEnv;
  if (!RESEND_API_KEY || !EMAIL_FROM || !CONTACT_EMAIL_TO) return false;
  // Plain text only: nothing the visitor typed is ever interpreted as HTML.
  const text = [
    `${input.name} <${input.email}>`,
    `Langue / Language: ${input.locale}`,
    '',
    input.message,
  ].join('\n');
  try {
    const response = await fetch(new URL('/emails', RESEND_API_URL), {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [CONTACT_EMAIL_TO],
        reply_to: input.email,
        subject: `[Contact] ${input.subject.replace(/[\r\n]+/g, ' ')}`,
        text,
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) console.error('[contact] Resend answered', response.status);
    return response.ok;
  } catch (error) {
    console.error(
      '[contact] Resend request failed',
      error instanceof Error ? error.message : error,
    );
    return false;
  }
}
