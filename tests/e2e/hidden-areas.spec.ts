import { expect, test } from '@playwright/test';
import { hiddenPaths, locales, messages } from './helpers';

// Until auth lands in phase 2 every hidden area answers 404 and is never indexed (D-010).
test.describe('hidden areas', () => {
  for (const locale of locales) {
    test(`return 404 and noindex in ${locale}`, async ({ page }) => {
      for (const path of hiddenPaths) {
        const response = await page.goto(`/${locale}${path}`);
        expect(response?.status(), path).toBe(404);
        expect(response?.headers()['x-robots-tag'], path).toContain('noindex');
        await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute(
          'content',
          /noindex/,
        );
        await expect(page.locator('h1')).toHaveText(messages[locale].notFound.title);
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

test.describe('auth placeholders', () => {
  test('are reachable but not indexed', async ({ page }) => {
    for (const path of ['/fr/login', '/fr/signup']) {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    }
  });
});
