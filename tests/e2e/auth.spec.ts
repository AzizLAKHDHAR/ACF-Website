import { expect, test } from '@playwright/test';
import { messages } from './helpers';
import { authLinkFromEmail, createConfirmedUser, demoUsers, signIn, uniqueEmail } from './supabase';

// End-to-end auth journeys against the local Supabase stack (npm run db:start; emails land in
// Mailpit). Desktop only: these exercise the server flows, and each run sends real emails.
test.skip(({ isMobile }) => isMobile, 'auth flows run once, on desktop');

const fr = messages.fr;
const ar = messages.ar;

test.describe('sign-up', () => {
  for (const locale of ['fr', 'ar'] as const) {
    test(`confirms the email and creates the account (${locale})`, async ({ page }) => {
      const copy = messages[locale];
      const email = uniqueEmail(`signup-${locale}`);
      await page.goto(`/${locale}/signup`);
      await page.getByLabel(copy.auth.displayNameLabel).fill(`Compte e2e ${locale}`);
      await page.getByLabel(copy.auth.emailLabel).fill(email);
      await page.getByLabel(copy.auth.passwordLabel).fill('e2e-password-1');
      await page.getByRole('button', { name: copy.auth.signUpButton }).click();
      await expect(page.locator('main').getByRole('status')).toHaveText(
        copy.auth.notices.checkEmail,
      );

      // The email follows the sign-up locale and links to that locale's confirm route.
      const { url, html } = await authLinkFromEmail(email);
      expect(url).toContain(`/${locale}/auth/confirm?token_hash=`);
      expect(html).toContain(`lang="${locale}"`);

      await page.goto(url);
      await expect(page).toHaveURL(`/${locale}/account`);
      await expect(page.getByText(`Compte e2e ${locale}`)).toBeVisible();
      await expect(page.getByTestId('account-role')).toHaveText(copy.auth.account.noRole);
    });
  }

  test('rejects a weak password before calling the server', async ({ page }) => {
    await page.goto('/fr/signup');
    await page.getByLabel(fr.auth.displayNameLabel).fill('Faible');
    await page.getByLabel(fr.auth.emailLabel).fill(uniqueEmail('weak'));
    await page.getByLabel(fr.auth.passwordLabel).fill('password');
    await page.getByRole('button', { name: fr.auth.signUpButton }).click();
    await expect(page.locator('main').getByRole('alert')).toHaveText(fr.auth.errors.invalidInput);
    await expect(page.getByText(fr.auth.fieldErrors.weakPassword).last()).toBeVisible();
  });
});

test.describe('sign-in', () => {
  test('with a password, then sign out', async ({ page }) => {
    await signIn(page, demoUsers.member);
    await expect(page).toHaveURL('/fr/account');
    await expect(page.getByTestId('account-role')).toHaveText(fr.auth.account.roles.member);
    await expect(page.getByRole('link', { name: fr.auth.accountLink })).toBeVisible();

    await page.getByRole('button', { name: fr.auth.signOutButton }).click();
    await expect(page).toHaveURL('/fr');
    await page.goto('/fr/account');
    await expect(page).toHaveURL('/fr/login?next=%2Faccount');
  });

  test('shows an error for a wrong password', async ({ page }) => {
    await signIn(page, demoUsers.member, 'wrong-password-1');
    await expect(page.locator('main').getByRole('alert')).toHaveText(
      fr.auth.errors.invalidCredentials,
    );
  });

  test('returns to the hidden area that asked for it (ar)', async ({ page }) => {
    await page.goto('/ar/member');
    await expect(page).toHaveURL('/ar/login?next=%2Fmember');
    const form = page.locator('form').filter({ has: page.locator('input[name="password"]') });
    await form.getByLabel(ar.auth.emailLabel).fill(demoUsers.member);
    await form.getByLabel(ar.auth.passwordLabel).fill('demo-password-1');
    await form.getByRole('button', { name: ar.auth.signInButton }).click();
    await expect(page).toHaveURL('/ar/member');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });

  test('with a magic link', async ({ page }) => {
    const email = uniqueEmail('magic');
    await createConfirmedUser(email, 'e2e-password-1');
    await page.goto('/fr/login?next=%2Faccount');
    const linkForm = page.locator('form').filter({ has: page.locator('#magic-email') });
    await linkForm.getByLabel(fr.auth.emailLabel).fill(email);
    await linkForm.getByRole('button', { name: fr.auth.magicLinkButton }).click();
    await expect(linkForm.getByRole('status')).toHaveText(fr.auth.notices.checkEmail);

    const { url } = await authLinkFromEmail(email);
    await page.goto(url);
    await expect(page).toHaveURL('/fr/account');
  });

  test('answers the same for unknown addresses (no account enumeration)', async ({ page }) => {
    await page.goto('/fr/login');
    const linkForm = page.locator('form').filter({ has: page.locator('#magic-email') });
    await linkForm.getByLabel(fr.auth.emailLabel).fill(uniqueEmail('nobody'));
    await linkForm.getByRole('button', { name: fr.auth.magicLinkButton }).click();
    await expect(linkForm.getByRole('status')).toHaveText(fr.auth.notices.checkEmail);
  });

  test('redirects signed-in users away from the sign-in page', async ({ page }) => {
    await signIn(page, demoUsers.registered);
    await expect(page).toHaveURL('/fr/account');
    await page.goto('/fr/login');
    await expect(page).toHaveURL('/fr/account');
  });
});

test.describe('password reset', () => {
  test('sends a recovery link and sets a new password', async ({ page }) => {
    const email = uniqueEmail('reset');
    await createConfirmedUser(email, 'old-password-1');
    await page.goto('/fr/forgot-password');
    await page.getByLabel(fr.auth.emailLabel).fill(email);
    await page.getByRole('button', { name: fr.auth.sendResetButton }).click();
    await expect(page.locator('main').getByRole('status')).toHaveText(fr.auth.notices.checkEmail);

    const { url } = await authLinkFromEmail(email);
    expect(url).toContain('type=recovery');
    await page.goto(url);
    await expect(page).toHaveURL('/fr/reset-password');
    await page.getByLabel(fr.auth.newPasswordLabel).fill('new-password-2');
    await page.getByLabel(fr.auth.confirmPasswordLabel).fill('new-password-2');
    await page.getByRole('button', { name: fr.auth.savePasswordButton }).click();
    await expect(page.locator('main').getByRole('status')).toHaveText(
      fr.auth.notices.passwordUpdated,
    );

    await page.goto('/fr/account');
    await page.getByRole('button', { name: fr.auth.signOutButton }).click();
    await expect(page).toHaveURL('/fr');
    await signIn(page, email, 'new-password-2');
    await expect(page).toHaveURL('/fr/account');
  });

  test('rejects an invalid link', async ({ page }) => {
    await page.goto('/fr/auth/confirm?token_hash=forged&type=recovery');
    await expect(page).toHaveURL('/fr/login?error=link');
    await expect(page.locator('main').getByRole('alert')).toHaveText(fr.auth.notices.linkInvalid);
  });
});

// Signed in without the required role → 404, so hidden areas don't reveal that they exist.
test.describe('role guards', () => {
  const cases = [
    { user: demoUsers.registered, allowed: [] as string[], denied: ['/member'] },
    { user: demoUsers.member, allowed: ['/member', '/member/tasks'], denied: ['/board'] },
    { user: demoUsers.board, allowed: ['/member', '/board', '/board/finance'], denied: ['/admin'] },
    { user: demoUsers.admin, allowed: ['/member', '/board', '/admin', '/admin/users'], denied: [] },
  ];
  for (const { user, allowed, denied } of cases) {
    test(`${user.split('@')[0]}: ${allowed.join(', ') || 'no area'} allowed; ${denied.join(', ') || 'nothing'} denied`, async ({
      page,
    }) => {
      await signIn(page, user);
      await expect(page).toHaveURL('/fr/account');
      for (const path of allowed) {
        const response = await page.goto(`/fr${path}`);
        expect(response?.status(), path).toBe(200);
        expect(response?.headers()['x-robots-tag'], path).toContain('noindex');
      }
      for (const path of denied) {
        const response = await page.goto(`/fr${path}`);
        expect(response?.status(), path).toBe(404);
        await expect(page.locator('h1')).toHaveText(fr.notFound.title);
      }
    });
  }
});
