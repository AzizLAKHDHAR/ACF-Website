import { expect, test } from '@playwright/test';
import { locales, messages, publicPaths } from './helpers';

test.describe('public pages', () => {
  for (const locale of locales) {
    test(`render every public section in ${locale}`, async ({ page }) => {
      for (const { key, path } of publicPaths) {
        const response = await page.goto(`/${locale}${path}`);
        expect(response?.status(), path).toBe(200);
        await expect(page.locator('h1')).toHaveText(messages[locale].pages[key].title);
        await expect(page.locator('main#main')).toBeVisible();
        await expect(page.locator('footer')).toBeVisible();
      }
    });
  }
});

test.describe('skip link', () => {
  test('is the first focusable element and moves focus to main', async ({ page }) => {
    await page.goto('/fr');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: messages.fr.common.skipToContent });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#main$/);
    await expect(page.locator('main#main')).toBeFocused();
  });
});

test.describe('desktop navigation', () => {
  test.skip(({ isMobile }) => isMobile, 'desktop only');

  test('opens the Discover menu with the keyboard', async ({ page }) => {
    await page.goto('/fr');
    const nav = page.getByRole('navigation', { name: messages.fr.nav.primary });
    await expect(nav).toBeVisible();
    await page.getByTestId('discover-trigger').focus();
    await page.keyboard.press('Enter');
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('menuitem')).toHaveCount(4);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/fr\/(artists|professionals)$/);
  });

  test('marks the current page', async ({ page }) => {
    await page.goto('/en/news');
    const current = page
      .getByRole('navigation', { name: messages.en.nav.primary })
      .getByRole('link', { name: messages.en.nav.news });
    await expect(current).toHaveAttribute('aria-current', 'page');
  });
});

test.describe('mobile drawer', () => {
  test.skip(({ isMobile }) => !isMobile, 'mobile only');

  for (const locale of ['fr', 'ar'] as const) {
    test(`opens from the inline end and navigates (${locale})`, async ({ page }) => {
      await page.goto(`/${locale}`);
      const trigger = page.getByTestId('mobile-menu-trigger');
      await trigger.tap();
      const drawer = page.getByRole('dialog');
      await expect(drawer).toBeVisible();
      await expect(
        drawer.getByRole('heading', { name: messages[locale].common.menu }),
      ).toBeVisible();

      // End side: right edge in LTR, left edge in RTL.
      await page.waitForTimeout(400);
      const box = await drawer.boundingBox();
      const width = page.viewportSize()?.width ?? 0;
      expect(box).not.toBeNull();
      if (locale === 'ar') expect(Math.round(box?.x ?? -1)).toBe(0);
      else expect(Math.round((box?.x ?? 0) + (box?.width ?? 0))).toBe(width);

      // Escape closes and returns focus to the trigger.
      await page.keyboard.press('Escape');
      await expect(drawer).toBeHidden();
      await expect(trigger).toBeFocused();

      await trigger.tap();
      await page.getByRole('dialog').getByRole('link', { name: messages[locale].nav.events }).tap();
      await expect(page).toHaveURL(new RegExp(`/${locale}/events$`));
      await expect(page.getByRole('dialog')).toBeHidden();
    });
  }
});

test.describe('theme', () => {
  test('switches to dark and remembers it', async ({ page }) => {
    await page.goto('/en');
    await page.getByTestId('theme-toggle').click();
    await page.getByTestId('theme-option-dark').click();
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);
  });

  test('follows the system preference by default', async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: 'dark' });
    const page = await context.newPage();
    await page.goto('/ar');
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);
    await context.close();
  });
});
