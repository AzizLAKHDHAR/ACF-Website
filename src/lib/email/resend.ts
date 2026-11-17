import 'server-only';
import { serverEnv } from '@/lib/env.server';

// Transactional email through Resend's HTTP API (no SDK: one fetch, nothing in client bundles).
// Without RESEND_API_KEY and EMAIL_FROM nothing is sent and callers are told so.

export function isEmailConfigured(): boolean {
  return Boolean(serverEnv.RESEND_API_KEY && serverEnv.EMAIL_FROM);
}

export async function sendEmail(message: {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}): Promise<boolean> {
  const { RESEND_API_KEY, RESEND_API_URL, EMAIL_FROM } = serverEnv;
  if (!RESEND_API_KEY || !EMAIL_FROM) return false;
  try {
    const response = await fetch(new URL('/emails', RESEND_API_URL), {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [message.to],
        subject: message.subject.replace(/[\r\n]+/g, ' '),
        text: message.text,
        ...(message.replyTo ? { reply_to: message.replyTo } : {}),
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) console.error('[email] Resend answered', response.status);
    return response.ok;
  } catch (error) {
    console.error('[email] Resend request failed', error instanceof Error ? error.message : error);
    return false;
  }
}
