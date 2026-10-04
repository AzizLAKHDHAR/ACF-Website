import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { locales } from './helpers';

const pages = ['', '/events', '/legal/privacy', '/this/does/not/exist'];

test.describe('accessibility (axe, WCAG 2.2 A/AA)', () => {
  for (const colorScheme of ['light', 'dark'] as const) {
    for (const locale of locales) {
      test(`${locale} ${colorScheme}`, async ({ browser, isMobile, viewport }) => {
        const context = await browser.newContext({ colorScheme, isMobile, viewport });
        const page = await context.newPage();
        for (const path of pages) {
          await page.goto(`/${locale}${path}`);
          await expect(page.locator('h1')).toBeVisible();
          const results = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
            .analyze();
          const summary = results.violations.map(
            (v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
          );
          expect(summary, `${locale}${path} ${colorScheme}`).toEqual([]);
        }
        await context.close();
      });
    }
  }
});

test.describe('SEO', () => {
  test('home pages declare canonical and hreflang alternates', async ({ page }) => {
    for (const locale of locales) {
      await page.goto(`/${locale}`);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        new RegExp(`/${locale}$`),
      );
      for (const alternate of [...locales, 'x-default']) {
        await expect(page.locator(`link[rel="alternate"][hreflang="${alternate}"]`)).toHaveCount(1);
      }
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.{50,}/);
    }
  });

  test('sitemap lists public pages only, robots hides private areas', async ({ request }) => {
    const sitemap = await (await request.get('/sitemap.xml')).text();
    expect(sitemap).toContain('/fr/events</loc>');
    expect(sitemap).toContain('hreflang="ar"');
    expect(sitemap).not.toMatch(/\/(member|board|admin|account|login|signup)/);

    const robots = await (await request.get('/robots.txt')).text();
    for (const area of ['member', 'board', 'admin', 'account']) {
      expect(robots).toContain(`Disallow: /*/${area}`);
    }
  });
});
