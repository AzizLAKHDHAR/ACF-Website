import { expect, test } from '@playwright/test';
import { locales, messages } from './helpers';

test.describe('locale negotiation', () => {
  test('redirects / to the locale of the Accept-Language header', async ({ browser }) => {
    // Chromium derives Accept-Language from the context locale.
    for (const [browserLocale, expected] of [
      ['fr-FR', 'fr'],
      ['en-US', 'en'],
      ['ar-TN', 'ar'],
    ] as const) {
      const context = await browser.newContext({ locale: browserLocale });
      const page = await context.newPage();
      await page.goto('/');
      await expect(page).toHaveURL(new RegExp(`/${expected}$`));
      await context.close();
    }
  });

  test('falls back to Arabic when no locale matches', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'de-DE' });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page).toHaveURL(/\/ar$/);
    await context.close();
  });

  test('adds the locale to unprefixed paths', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'fr-FR' });
    const page = await context.newPage();
    await page.goto('/events');
    await expect(page).toHaveURL(/\/fr\/events$/);
    await context.close();
  });
});

test.describe('document language and direction', () => {
  for (const locale of locales) {
    test(`/${locale} sets lang and dir`, async ({ page }) => {
      await page.goto(`/${locale}`);
      const html = page.locator('html');
      await expect(html).toHaveAttribute('lang', locale);
      await expect(html).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
      await expect(page.locator('h1')).toHaveText(messages[locale].home.title);
      await expect(page).toHaveTitle(messages[locale].metadata.title);
    });
  }
});

test.describe('locale switcher', () => {
  test('keeps the current path and persists the choice', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'fr-FR' });
    const page = await context.newPage();
    await page.goto('/fr/events');

    await page.getByTestId('locale-switcher').click();
    await page.getByTestId('locale-option-ar').click();

    await expect(page).toHaveURL(/\/ar\/events$/);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('h1')).toHaveText(messages.ar.pages.events.title);

    const cookie = (await context.cookies()).find((c) => c.name === 'NEXT_LOCALE');
    expect(cookie?.value).toBe('ar');
    // Persistent (about a year), not a session cookie.
    expect(cookie?.expires ?? -1).toBeGreaterThan(Date.now() / 1000 + 300 * 24 * 3600);

    // The cookie wins over Accept-Language (fr) on the next visit.
    await page.goto('/');
    await expect(page).toHaveURL(/\/ar$/);
    await context.close();
  });

  test('works with the keyboard', async ({ page }) => {
    await page.goto('/en/news');
    await page.getByTestId('locale-switcher').focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('menu')).toBeVisible();
    await page.getByTestId('locale-option-fr').focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/fr\/news$/);
  });
});
