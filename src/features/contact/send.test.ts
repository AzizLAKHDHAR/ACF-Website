import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const env = vi.hoisted(() => ({
  serverEnv: {
    RESEND_API_KEY: 're_test' as string | undefined,
    RESEND_API_URL: 'http://resend.test',
    EMAIL_FROM: 'ACF <no-reply@acf.test>',
    CONTACT_EMAIL_TO: 'contact@acf.test' as string | undefined,
    TURNSTILE_SECRET_KEY: undefined as string | undefined,
  },
}));
vi.mock('@/lib/env.server', () => env);

const { isContactConfigured, sendContactEmail, verifyTurnstile } = await import('./send');

const input = {
  locale: 'fr' as const,
  name: 'Visiteur',
  email: 'v@acf.test',
  subject: 'Bonjour\r\nBcc: x@evil.test',
  message: '<b>salut</b>',
};

afterEach(() => {
  vi.unstubAllGlobals();
  env.serverEnv.TURNSTILE_SECRET_KEY = undefined;
  env.serverEnv.CONTACT_EMAIL_TO = 'contact@acf.test';
});

describe('contact email', () => {
  it('is unavailable without a recipient', () => {
    expect(isContactConfigured()).toBe(true);
    env.serverEnv.CONTACT_EMAIL_TO = undefined;
    expect(isContactConfigured()).toBe(false);
  });

  it('sends plain text to the fixed recipient, Reply-To the visitor, with a single-line subject', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await sendContactEmail(input)).toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(String(url)).toBe('http://resend.test/emails');
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({
      to: ['contact@acf.test'],
      reply_to: 'v@acf.test',
      subject: '[Contact] Bonjour Bcc: x@evil.test',
    });
    expect(body.html).toBeUndefined();
    expect(body.text).toContain('<b>salut</b>');
  });

  it('reports a failed delivery', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 500 })),
    );
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await sendContactEmail(input)).toBe(false);
  });
});

describe('verifyTurnstile', () => {
  it('passes when Turnstile is not configured', async () => {
    expect(await verifyTurnstile(undefined)).toBe(true);
  });

  it('requires a token and a successful siteverify once configured', async () => {
    env.serverEnv.TURNSTILE_SECRET_KEY = 'secret';
    expect(await verifyTurnstile(undefined)).toBe(false);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ success: false })),
    );
    expect(await verifyTurnstile('token')).toBe(false);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ success: true })),
    );
    expect(await verifyTurnstile('token')).toBe(true);
  });
});
