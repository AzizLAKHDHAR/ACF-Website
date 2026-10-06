import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { messages } from './helpers';

// Phase 3 journeys against the seeded local stack (supabase/seed.sql, fictional `demo-*` rows).
const fr = messages.fr;
const ar = messages.ar;
const wcag = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const drafts = {
  profiles: ['/artists/demo-brouillon-artiste', '/studios/demo-studio-echo'],
  events: ['/events/demo-evenement-brouillon', '/events/demo-proposition'],
  posts: ['/news/demo-brouillon', '/blogs/demo-carnet-sonore/demo-billet-brouillon'],
};
const draftNames = [
  'Brouillon Secret',
  'Soirée proposée',
  'demo-proposition',
  'demo-brouillon',
  'demo-evenement-brouillon',
  'demo-billet-brouillon',
  'demo-studio-echo',
];

test.describe('unpublished content never leaks', () => {
  test('drafts and pending items are 404 and absent from lists, search and the sitemap', async ({
    page,
    request,
  }) => {
    for (const path of Object.values(drafts).flat()) {
      const response = await page.goto(`/fr${path}`);
      expect(response?.status(), path).toBe(404);
    }
    for (const path of [
      '/artists',
      '/studios',
      '/events',
      '/news',
      '/blogs',
      '/search?q=brouillon',
    ]) {
      const html = await (await request.get(`/fr${path}`)).text();
      for (const name of draftNames) expect(html, `${path} shows ${name}`).not.toContain(name);
    }
    const sitemap = await (await request.get('/sitemap.xml')).text();
    for (const name of draftNames) expect(sitemap).not.toContain(name);
    expect(sitemap).toContain('/fr/artists/demo-al-amwaj</loc>');
    expect(sitemap).toContain('/ar/news/');
  });
});

test.describe('catalogue', () => {
  test('filters artists by genre and governorate (fr)', async ({ page }) => {
    await page.goto('/fr/artists');
    const form = page.getByRole('search', { name: fr.content.filters.label });
    await form.getByLabel(fr.content.filters.genre).selectOption('jazz');
    await form.getByRole('button', { name: fr.content.filters.apply }).click();
    await expect(page).toHaveURL(/genre=jazz/);
    await expect(page.getByRole('link', { name: /الأمواج/ })).toBeVisible();

    await form.getByLabel(fr.content.filters.governorate).selectOption('TN-11');
    await form.getByRole('button', { name: fr.content.filters.apply }).click();
    await expect(page.getByRole('link', { name: /الأمواج/ })).toHaveCount(0);
  });

  test('shows a profile with JSON-LD and a click-to-load player (ar)', async ({ page }) => {
    const thirdParty: string[] = [];
    page.on('request', (request) => {
      if (/youtube|ytimg|spotify|soundcloud/.test(new URL(request.url()).hostname))
        thirdParty.push(request.url());
    });
    await page.goto('/ar/artists/demo-al-amwaj');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('h1')).toHaveText('الأمواج (تجريبي)');
    const jsonLd = JSON.parse(
      (await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}',
    );
    expect(jsonLd['@type']).toBe('MusicGroup');

    expect(thirdParty).toEqual([]);
    await expect(page.locator('iframe')).toHaveCount(0);
    await page
      .getByRole('button', { name: ar.content.embed.play.replace('{provider}', 'YouTube') })
      .click();
    await expect(page.locator('iframe')).toHaveAttribute(
      'src',
      /^https:\/\/www\.youtube-nocookie\.com\/embed\//,
    );
  });
});

test.describe('events', () => {
  test('lists upcoming events, then past ones, and opens one (fr)', async ({ page }) => {
    await page.goto('/fr/events');
    await page.getByRole('link', { name: /Soirée jazz/ }).click();
    await expect(page).toHaveURL('/fr/events/demo-soiree-jazz');
    await expect(page.getByRole('link', { name: fr.content.event.tickets })).toHaveAttribute(
      'rel',
      'nofollow ugc noopener',
    );
    const jsonLd = JSON.parse(
      (await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}',
    );
    expect(jsonLd['@type']).toBe('MusicEvent');

    await page.goto('/fr/events?when=past');
    await expect(page.getByRole('link', { name: /Soirée jazz/ })).toHaveCount(0);
    await page.goto('/fr/events/demo-concert-passe');
    await expect(page.getByText(fr.content.event.past)).toBeVisible();
  });

  test('filters events by date range', async ({ page }) => {
    await page.goto('/fr/events?from=2000-01-01&to=2000-01-02');
    await expect(page.getByRole('status').first()).toHaveText(/0|Aucun/);
  });
});

test.describe('search', () => {
  test('finds Arabic names without hamza and Latin names without accents', async ({ page }) => {
    await page.goto(`/ar/search?q=${encodeURIComponent('الامواج')}`);
    await expect(page.getByRole('link', { name: /الأمواج/ })).toBeVisible();
    await page.goto('/fr/search?q=soiree');
    await expect(page.getByRole('link', { name: /Soirée jazz/ })).toBeVisible();
    await page.goto('/fr/search?q=zzzzzz');
    await expect(page.getByText(fr.content.search.none.replace('{query}', 'zzzzzz'))).toBeVisible();
  });
});

test.describe('news and blogs', () => {
  test('a news article links its translations (fr → ar)', async ({ page }) => {
    await page.goto('/fr/news');
    await page.getByRole('link', { name: /bénévoles/i }).click();
    await expect(page.locator('link[rel="alternate"][hreflang="ar"]')).toHaveCount(1);
    await page.getByRole('link', { name: messages.fr.localeNames.ar }).last().click();
    await expect(page).toHaveURL(/\/ar\/news\//);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });

  test('a blog post keeps its own language inside another locale', async ({ page }) => {
    await page.goto('/fr/blogs/demo-carnet-sonore/demo-tadwina');
    await expect(page.locator('article')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('article')).toHaveAttribute('dir', 'rtl');
    const jsonLd = JSON.parse(
      (await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}',
    );
    expect(jsonLd['@type']).toBe('BlogPosting');
  });
});

test.describe('contact form', () => {
  test.skip(({ isMobile }) => isMobile, 'sends one email per run');

  test('forwards the message by email with the visitor as Reply-To (ar)', async ({
    page,
    request,
  }) => {
    const subject = `e2e ${Date.now()}`;
    await page.goto('/ar/contact');
    await page.getByLabel(ar.content.contact.name).fill('زائر تجريبي');
    await page.getByLabel(ar.content.contact.email).fill('visitor@acf.test');
    await page.getByLabel(ar.content.contact.subject).fill(subject);
    await page.getByLabel(ar.content.contact.message).fill('رسالة تجريبية');
    await page.getByRole('button', { name: ar.content.contact.send }).click();
    await expect(page.getByRole('status')).toHaveText(ar.content.contact.sent);

    const emails = (await (await request.get('http://127.0.0.1:3999/emails')).json()) as Record<
      string,
      unknown
    >[];
    const email = emails.find((entry) => String(entry.subject).includes(subject));
    expect(email).toMatchObject({
      to: ['contact@acf.test'],
      reply_to: 'visitor@acf.test',
      authorization: 'Bearer re_e2e_test_key',
    });
    expect(String(email?.text)).toContain('رسالة تجريبية');
  });

  test('shows field errors and passes axe (fr)', async ({ page }) => {
    await page.goto('/fr/contact');
    await page.getByRole('button', { name: fr.content.contact.send }).click();
    await expect(page.locator('main').getByRole('alert')).toHaveText(
      fr.content.contact.errors.invalidInput,
    );
    await expect(page.locator('[aria-invalid="true"]')).toHaveCount(4);
    const results = await new AxeBuilder({ page }).withTags(wcag).analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});

test.describe('revalidation webhook', () => {
  test.skip(({ isMobile }) => isMobile, 'changes shared data');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
  const secret = process.env.SUPABASE_SECRET_KEY ?? '';
  const setTagline = (tagline: Record<string, string>) =>
    fetch(`${supabaseUrl}/rest/v1/public_profiles?slug=eq.demo-studio-nuit`, {
      method: 'PATCH',
      headers: {
        apikey: secret,
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tagline }),
    });

  test('rejects a wrong secret and refreshes cached pages with the right one', async ({
    page,
    request,
  }) => {
    const denied = await request.post('/api/webhooks/content', {
      headers: { Authorization: 'Bearer wrong' },
      data: { table: 'public_profiles' },
    });
    expect(denied.status()).toBe(401);

    await page.goto('/fr/studios/demo-studio-nuit');
    const fresh = `Mis à jour ${Date.now()}`;
    expect((await setTagline({ fr: fresh })).ok).toBe(true);
    try {
      // Cached: the change isn't visible until the webhook (or the 5-minute expiry) refreshes it.
      expect(await (await request.get('/fr/studios/demo-studio-nuit')).text()).not.toContain(fresh);
      const allowed = await request.post('/api/webhooks/content', {
        headers: { Authorization: `Bearer ${process.env.CONTENT_WEBHOOK_SECRET}` },
        data: { type: 'UPDATE', table: 'public_profiles' },
      });
      expect(await allowed.json()).toEqual({ ok: true, revalidated: ['profiles'] });
      await expect
        .poll(async () =>
          (await (await request.get('/fr/studios/demo-studio-nuit')).text()).includes(fresh),
        )
        .toBe(true);
    } finally {
      await setTagline({
        fr: 'Studio d’enregistrement fictif',
        ar: 'استوديو تسجيل خيالي',
        en: 'Fictional recording studio',
      });
      await request.post('/api/webhooks/content', {
        headers: { Authorization: `Bearer ${process.env.CONTENT_WEBHOOK_SECRET}` },
        data: { table: 'public_profiles' },
      });
    }
  });
});

test.describe('accessibility of content templates', () => {
  const templates = [
    '/artists',
    '/artists/demo-al-amwaj',
    '/venues/demo-cave-fictive',
    '/events/demo-soiree-jazz',
    '/news',
    '/news/demo-appel-benevoles',
    '/blogs',
    '/blogs/demo-carnet-sonore',
    '/blogs/demo-carnet-sonore/demo-premier-billet',
    '/search?q=jazz',
    '/contact',
  ];
  for (const locale of ['ar', 'fr'] as const) {
    for (const colorScheme of ['light', 'dark'] as const) {
      test(`${locale} ${colorScheme}`, async ({ browser, isMobile, viewport }) => {
        const context = await browser.newContext({ colorScheme, isMobile, viewport });
        const page = await context.newPage();
        for (const path of templates) {
          const response = await page.goto(`/${locale}${path}`);
          expect(response?.status(), path).toBe(200);
          const results = await new AxeBuilder({ page }).withTags(wcag).analyze();
          const summary = results.violations.map(
            (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
          );
          expect(summary, `${locale}${path} ${colorScheme}`).toEqual([]);
        }
        await context.close();
      });
    }
  }
});
