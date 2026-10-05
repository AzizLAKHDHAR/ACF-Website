import { expect, test } from '@playwright/test';
import { hiddenPaths, locales, messages } from './helpers';

// Signed-out visitors are sent to sign in (and come back afterwards); the areas are never indexed.
// Signed-in users without the role get a 404: see auth.spec.ts.
test.describe('hidden areas, signed out', () => {
  for (const locale of locales) {
    test(`redirect to sign-in and stay noindex in ${locale}`, async ({ page, request }) => {
      for (const path of hiddenPaths) {
        const direct = await request.get(`/${locale}${path}`, { maxRedirects: 0 });
        expect(direct.status(), path).toBe(307);
        expect(direct.headers()['x-robots-tag'], path).toContain('noindex');

        await page.goto(`/${locale}${path}`);
        const area = `/${path.split('/')[1]}`;
        await expect(page).toHaveURL(`/${locale}/login?next=${encodeURIComponent(area)}`);
      }
    });
  }
});

test.describe('not found', () => {
  for (const locale of locales) {
    test(`unknown paths get the localized 404 page in ${locale}`, async ({ page }) => {
      const response = await page.goto(`/${locale}/this/does/not/exist`);
      expect(response?.status()).toBe(404);
      await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
      await expect(page.locator('h1')).toHaveText(messages[locale].notFound.title);
      await expect(
        page.getByRole('link', { name: messages[locale].notFound.backHome }),
      ).toBeVisible();
    });
  }
});

test.describe('auth pages', () => {
  test('are reachable but not indexed', async ({ page }) => {
    for (const path of ['/fr/login', '/fr/signup', '/fr/forgot-password']) {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    }
  });
});
