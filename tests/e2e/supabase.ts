import { expect, type Page } from '@playwright/test';

// Local Supabase stack (npm run db:start). Mailpit catches every auth email.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const mailpitUrl = process.env.MAILPIT_URL ?? 'http://127.0.0.1:54324';

export const DEMO_PASSWORD = 'demo-password-1';
export const demoUsers = {
  admin: 'admin@acf.test',
  board: 'board@acf.test',
  member: 'member@acf.test',
  registered: 'registered@acf.test',
} as const;

export function uniqueEmail(tag: string): string {
  return `e2e-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@acf.test`;
}

/** Waits for the newest email to `to` and returns the auth link it contains. */
export async function authLinkFromEmail(to: string): Promise<{ url: string; html: string }> {
  let html = '';
  await expect
    .poll(
      async () => {
        const search = await fetch(
          `${mailpitUrl}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`,
        );
        const { messages = [] } = (await search.json()) as { messages?: { ID: string }[] };
        const latest = messages[0];
        if (!latest) return '';
        const message = (await (
          await fetch(`${mailpitUrl}/api/v1/message/${latest.ID}`)
        ).json()) as { HTML: string };
        html = message.HTML;
        return html;
      },
      { timeout: 20_000, message: `email to ${to}` },
    )
    .not.toBe('');
  const href = /href="([^"]*\/auth\/confirm[^"]*)"/.exec(html)?.[1];
  if (!href) throw new Error(`No auth link in the email to ${to}`);
  return { url: href.replaceAll('&amp;', '&'), html };
}

/** A confirmed user created through the Auth admin API (local secret key only). */
export async function createConfirmedUser(
  email: string,
  password: string,
  locale = 'fr',
): Promise<void> {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error('SUPABASE_SECRET_KEY is required for this test (npm run db:env).');
  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: secret,
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { locale, display_name: 'E2E' },
    }),
  });
  expect(response.ok, await response.text()).toBe(true);
}

export async function signIn(
  page: Page,
  email: string,
  password = DEMO_PASSWORD,
  locale = 'fr',
  next?: string,
) {
  await page.goto(`/${locale}/login${next ? `?next=${encodeURIComponent(next)}` : ''}`);
  const form = page.locator('form').filter({ has: page.locator('input[name="password"]') });
  await form.locator('input[name="email"]').fill(email);
  await form.locator('input[name="password"]').fill(password);
  await form.locator('button[type="submit"]').click();
}
