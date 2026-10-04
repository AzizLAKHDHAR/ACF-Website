import { mkdirSync, readFileSync } from 'node:fs';
import { expect, test, type Browser } from '@playwright/test';
import { locales, messages, type Locale } from '../e2e/helpers';

const RAW_DIR = 'test-results/screenshots';
const SHEET_DIR = process.env.SCREENSHOT_DIR ?? 'docs/screenshots/brand';

const areas = [
  { name: 'public', path: '' },
  { name: 'member', path: '/member' },
  { name: 'board', path: '/board/finance' },
  { name: 'about', path: '/about' },
  { name: 'admin', path: '/admin' },
] as const;

const viewports = {
  desktop: { width: 1280, height: 800, isMobile: false },
  mobile: { width: 390, height: 844, isMobile: true },
} as const;

type Variant = `${keyof typeof viewports}-${'light' | 'dark'}`;
const variants: Variant[] = ['desktop-light', 'desktop-dark', 'mobile-light', 'mobile-dark'];

async function capture(
  browser: Browser,
  locale: Locale,
  path: string,
  variant: Variant,
  file: string,
  openDrawer?: string,
) {
  const [viewportName, colorScheme] = variant.split('-') as [
    keyof typeof viewports,
    'light' | 'dark',
  ];
  const { width, height, isMobile } = viewports[viewportName];
  const context = await browser.newContext({
    viewport: { width, height },
    isMobile,
    hasTouch: isMobile,
    deviceScaleFactor: 1,
    colorScheme,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto(`/${locale}${path}`, { waitUntil: 'networkidle' });
  await expect(page.locator('h1')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  if (openDrawer) {
    await page.getByTestId(openDrawer).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.waitForTimeout(400);
  }
  await page.screenshot({ path: `${RAW_DIR}/${file}.png`, fullPage: !openDrawer });
  // Above-the-fold version for the contact sheets.
  await page.screenshot({ path: `${RAW_DIR}/fold/${file}.png` });
  await context.close();
}

async function contactSheet(
  browser: Browser,
  title: string,
  rows: Array<{ label: string; files: string[]; columns: string[] }>,
  out: string,
) {
  const img = (file: string) =>
    `data:image/png;base64,${readFileSync(`${RAW_DIR}/fold/${file}.png`).toString('base64')}`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    body { margin: 0; padding: 24px; background: #e5e5e5; font: 14px/1.4 system-ui, sans-serif; color: #171717; }
    h1 { font-size: 18px; margin: 0 0 16px; }
    .row { display: flex; gap: 16px; align-items: flex-start; margin-bottom: 20px; }
    .label { width: 36px; font-weight: 600; padding-top: 4px; }
    figure { margin: 0; } figcaption { font-size: 12px; color: #525252; margin-bottom: 4px; }
    img { display: block; border: 1px solid #a3a3a3; background: white; }
    img.desktop { width: 480px; } img.mobile { width: 180px; }
  </style></head><body><h1>${title}</h1>
  ${rows
    .map(
      (row) =>
        `<div class="row"><div class="label">${row.label}</div>${row.files
          .map(
            (file, i) =>
              `<figure><figcaption>${row.columns[i]}</figcaption><img class="${file.includes('mobile') ? 'mobile' : 'desktop'}" src="${img(file)}"></figure>`,
          )
          .join('')}</div>`,
    )
    .join('')}
  </body></html>`;
  const context = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path: out, fullPage: true, type: 'jpeg', quality: 82 });
  await context.close();
}

test.describe.configure({ mode: 'serial' });

test('shell screenshots: every area × locale × theme × viewport', async ({ browser }) => {
  mkdirSync(`${RAW_DIR}/fold`, { recursive: true });
  mkdirSync(SHEET_DIR, { recursive: true });

  for (const area of areas) {
    for (const locale of locales) {
      for (const variant of variants) {
        await capture(browser, locale, area.path, variant, `${area.name}-${locale}-${variant}`);
      }
    }
    await contactSheet(
      browser,
      `ACF · ${area.name} shell · /{locale}${area.path || '/'}`,
      locales.map((locale) => ({
        label: locale,
        files: variants.map((v) => `${area.name}-${locale}-${v}`),
        columns: variants,
      })),
      `${SHEET_DIR}/${area.name}.jpg`,
    );
  }
});

test('drawer screenshots: public and member menus open on mobile', async ({ browser }) => {
  for (const locale of locales) {
    await capture(
      browser,
      locale,
      '',
      'mobile-light',
      `drawer-public-${locale}`,
      'mobile-menu-trigger',
    );
    await capture(
      browser,
      locale,
      '/member',
      'mobile-dark',
      `drawer-member-${locale}`,
      'area-menu-trigger',
    );
  }
  await contactSheet(
    browser,
    'ACF · mobile drawers (public: light, opens from the inline end · member: dark, opens from the inline start)',
    locales.map((locale) => ({
      label: locale,
      files: [`drawer-public-${locale}`, `drawer-member-${locale}`],
      columns: [messages[locale].common.menu, messages[locale].areas.member.name],
    })),
    `${SHEET_DIR}/drawers.jpg`,
  );
});
