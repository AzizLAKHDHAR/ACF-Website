import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { messages } from './helpers';
import { createConfirmedUser, demoUsers, signIn, uniqueEmail } from './supabase';

// Phase 4 journeys against the seeded local stack: onboarding, admin approval, co-managers,
// uploads, event proposals and blog translations. Desktop only: they change shared data.
test.skip(({ isMobile }) => isMobile, 'onboarding journeys run once, on desktop');

const fr = messages.fr;
const ar = messages.ar;
const wcag = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const PASSWORD = 'e2e-password-1';

// Demo venue and blog from supabase/seed.sql.
const DEMO_VENUE_ID = '00000000-0000-4000-b000-000000000002';
const DEMO_BLOG_ID = '00000000-0000-4000-b000-000000000003';

function token(): string {
  return Math.random().toString(36).slice(2, 8).replace(/[0-9]/g, 'x');
}

async function newSignedInPage(browser: Browser, email: string, password?: string, locale = 'fr') {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, email, password, locale);
  await expect(page).toHaveURL(`/${locale}/account`);
  return page;
}

/** Creates a profile from /account/profiles and returns the editor URL's profile id. */
async function createProfile(page: Page, locale: 'ar' | 'fr', type: string, name: string) {
  const copy = messages[locale];
  await page.goto(`/${locale}/account/profiles`);
  const form = page.getByTestId('create-profile');
  await form.locator('select[name="type"]').selectOption(type);
  await form.locator('input[name="displayName"]').fill(name);
  await form.getByRole('button', { name: copy.profiles.create.submit }).click();
  await expect(page).toHaveURL(new RegExp(`/${locale}/account/profiles/[0-9a-f-]{36}$`));
  await expect(page.getByTestId('profile-status')).toHaveText(copy.profiles.status.draft);
  return page.url().split('/').pop() as string;
}

/** Fills what submitting requires (a tagline and a governorate) and saves. */
async function fillRequired(page: Page, locale: 'ar' | 'fr', tagline: string) {
  const copy = messages[locale];
  const form = page.getByTestId('profile-general');
  await form.locator(`input[name="tagline_${locale}"]`).fill(tagline);
  await form.locator('select[name="governorate"]').selectOption('TN-11');
  await form.getByRole('button', { name: copy.profiles.save }).click();
  await expect(form.getByRole('status')).toHaveText(copy.forms.notices.saved);
}

// Both helpers check the status badge: the page re-renders after the action, and the form that
// was used disappears when the new status doesn't offer it any more.
async function submitForReview(page: Page, locale: 'ar' | 'fr', again = false) {
  const copy = messages[locale];
  const form = page.getByTestId('submit-profile');
  await form
    .getByRole('button', {
      name: again ? copy.profiles.review.resubmit : copy.profiles.review.submit,
    })
    .click();
  await expect(page.getByTestId('profile-status')).toHaveText(copy.profiles.status.pending);
}

async function decide(
  page: Page,
  profileId: string,
  decision: 'approved' | 'rejected',
  note?: string,
) {
  await page.goto(`/fr/admin/approvals/${profileId}`);
  const form = page.getByTestId('review-decision');
  await form.locator('select[name="decision"]').selectOption(decision);
  if (note) await form.locator('textarea[name="notePublic"]').fill(note);
  await form.getByRole('button', { name: fr.review.decide }).click();
  await expect(page.getByTestId('profile-status')).toHaveText(fr.profiles.status[decision]);
}

test.describe('profile onboarding and approval', () => {
  test('an artist profile created in Arabic is approved and appears publicly', async ({
    page,
    browser,
    request,
  }) => {
    const email = uniqueEmail('artist-ar');
    await createConfirmedUser(email, PASSWORD, 'ar');
    await signIn(page, email, PASSWORD, 'ar');
    await expect(page).toHaveURL('/ar/account');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

    const name = `فرقة الأمواج ${token()}`;
    const profileId = await createProfile(page, 'ar', 'artist', name);
    // An Arabic-only name gets a Latin fallback slug the owner can change.
    const slug = await page
      .getByTestId('profile-general')
      .locator('input[name="slug"]')
      .inputValue();
    expect(slug).toMatch(/^artist-[a-z0-9]{6}$/);

    // Submitting too early lists what is missing.
    const submit = page.getByTestId('submit-profile');
    await submit.getByRole('button', { name: ar.profiles.review.submit }).click();
    await expect(submit.getByRole('alert')).toContainText(ar.forms.errors.incomplete);
    await expect(submit.getByRole('alert')).toContainText(ar.forms.missing.governorate);

    await fillRequired(page, 'ar', 'فرقة خيالية للاختبار');
    await submitForReview(page, 'ar');

    const admin = await newSignedInPage(browser, demoUsers.admin);
    await admin.goto('/fr/admin/approvals');
    await expect(admin.getByRole('link', { name })).toBeVisible();
    await decide(admin, profileId, 'approved');

    await page.reload();
    await expect(page.getByTestId('profile-status')).toHaveText(ar.profiles.status.approved);
    await page.goto(`/ar/artists/${slug}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
    await page.goto(`/ar/artists?q=${encodeURIComponent(name.split(' ').pop() as string)}`);
    await expect(page.locator('main').getByRole('link', { name })).toBeVisible();

    // The decision email went out in the manager's language (Arabic).
    const emails = (await (await request.get('http://127.0.0.1:3999/emails')).json()) as {
      to: string[];
      subject: string;
      text: string;
    }[];
    const sent = emails.find((entry) => entry.to.includes(email));
    expect(sent?.subject).toContain(name);
    expect(sent?.subject).toContain('نُشر ملفك');
    expect(sent?.text).toContain(`/ar/account/profiles/${profileId}`);
  });

  test('a rejected profile shows the public note and can be resubmitted (fr)', async ({
    page,
    browser,
  }) => {
    const email = uniqueEmail('studio-fr');
    await createConfirmedUser(email, PASSWORD, 'fr');
    await signIn(page, email, PASSWORD);
    const profileId = await createProfile(page, 'fr', 'studio', `Studio e2e ${token()}`);
    await fillRequired(page, 'fr', 'Studio fictif pour les tests');
    await submitForReview(page, 'fr');

    const admin = await newSignedInPage(browser, demoUsers.admin);
    const note = `Ajoutez une photo, merci (${token()}).`;
    // A rejection without a note is refused.
    await admin.goto(`/fr/admin/approvals/${profileId}`);
    const form = admin.getByTestId('review-decision');
    await form.locator('select[name="decision"]').selectOption('rejected');
    await form.getByRole('button', { name: fr.review.decide }).click();
    await expect(form.getByText(fr.forms.fieldErrors.required)).toBeVisible();
    await decide(admin, profileId, 'rejected', note);

    await page.reload();
    await expect(page.getByTestId('profile-status')).toHaveText(fr.profiles.status.rejected);
    await expect(page.getByTestId('review-note')).toContainText(note);
    await submitForReview(page, 'fr', true);
  });

  test('one user owns several profiles; a co-manager can edit; someone else gets a 404', async ({
    page,
    browser,
  }) => {
    const owner = uniqueEmail('owner');
    const editor = uniqueEmail('editor');
    await createConfirmedUser(owner, PASSWORD, 'fr');
    await createConfirmedUser(editor, PASSWORD, 'fr');
    await signIn(page, owner, PASSWORD);
    const studioName = `Studio e2e ${token()}`;
    const studioId = await createProfile(page, 'fr', 'studio', studioName);
    const artistName = `Artiste e2e ${token()}`;
    const profileId = await createProfile(page, 'fr', 'artist', artistName);

    // Both profiles are listed; the user switches between them from the list.
    await page.goto('/fr/account/profiles');
    await expect(page.getByRole('link', { name: artistName })).toBeVisible();
    await page.getByRole('link', { name: studioName }).click();
    await expect(page).toHaveURL(`/fr/account/profiles/${studioId}`);
    await page.goto(`/fr/account/profiles/${profileId}`);

    const add = page.getByTestId('add-manager');
    await add.locator('input[name="email"]').fill('nobody-e2e@acf.test');
    await add.getByRole('button', { name: fr.profiles.managers.add.submit }).click();
    await expect(add.getByRole('alert')).toContainText(fr.forms.errors.unknownEmail);
    await add.locator('input[name="email"]').fill(editor);
    await add.getByRole('button', { name: fr.profiles.managers.add.submit }).click();
    await expect(add.getByRole('status')).toHaveText(fr.forms.notices.added);

    const editorPage = await newSignedInPage(browser, editor, PASSWORD);
    await editorPage.goto(`/fr/account/profiles/${profileId}`);
    const general = editorPage.getByTestId('profile-general');
    await general.locator('input[name="city"]').fill('Bizerte');
    await general.getByRole('button', { name: fr.profiles.save }).click();
    await expect(general.getByRole('status')).toHaveText(fr.forms.notices.saved);
    // Editors don't get the "add a manager" form.
    await expect(editorPage.getByTestId('add-manager')).toHaveCount(0);

    const stranger = await newSignedInPage(browser, demoUsers.registered);
    const response = await stranger.goto(`/fr/account/profiles/${profileId}`);
    expect(response?.status()).toBe(404);
  });

  test('rejects wrong-type and oversized images with a localized message (ar)', async ({
    page,
  }) => {
    const email = uniqueEmail('upload');
    await createConfirmedUser(email, PASSWORD, 'ar');
    await signIn(page, email, PASSWORD, 'ar');
    await createProfile(page, 'ar', 'venue', `Venue e2e ${token()}`);

    const avatar = page.getByLabel(ar.profiles.media.avatar);
    await avatar.setInputFiles({
      name: 'document.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 fictional'),
    });
    await expect(page.getByText(ar.forms.uploadErrors.fileType)).toBeVisible();
    await avatar.setInputFiles({
      name: 'huge.png',
      mimeType: 'image/png',
      buffer: Buffer.alloc(16 * 1024 * 1024),
    });
    await expect(page.getByText(ar.forms.uploadErrors.fileTooLarge)).toBeVisible();
  });

  test('the editor and the approval queue pass axe (ar, fr)', async ({ page, browser }) => {
    const email = uniqueEmail('axe');
    await createConfirmedUser(email, PASSWORD, 'ar');
    await signIn(page, email, PASSWORD, 'ar');
    await createProfile(page, 'ar', 'artist', `Axe e2e ${token()}`);
    const editorResults = await new AxeBuilder({ page }).withTags(wcag).analyze();
    expect(editorResults.violations.map((v) => v.id)).toEqual([]);
    await page.goto('/ar/account/profiles');
    const listResults = await new AxeBuilder({ page }).withTags(wcag).analyze();
    expect(listResults.violations.map((v) => v.id)).toEqual([]);

    const admin = await newSignedInPage(browser, demoUsers.admin);
    await admin.goto('/fr/admin/approvals');
    const queueResults = await new AxeBuilder({ page: admin }).withTags(wcag).analyze();
    expect(queueResults.violations.map((v) => v.id)).toEqual([]);
  });
});

test.describe('content from approved profiles', () => {
  test('an approved venue proposes an event; the board publishes it', async ({ browser }) => {
    const venue = await newSignedInPage(browser, demoUsers.venue);
    const title = `Soirée e2e ${token()}`;
    await venue.goto(`/fr/account/profiles/${DEMO_VENUE_ID}/events`);
    const form = venue.getByTestId('propose-event');
    await form.locator('input[name="title_fr"]').fill(title);
    const start = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 16);
    await form.locator('input[name="startsAt"]').fill(start);
    await form.getByRole('button', { name: fr.proposals.submit }).click();
    await expect(form.getByRole('status')).toHaveText(fr.forms.notices.proposed);
    await venue.reload();
    await expect(venue.getByText(title)).toBeVisible();

    const board = await newSignedInPage(browser, demoUsers.board);
    await board.goto('/fr/board/events');
    const proposal = board.getByTestId('proposal').filter({ hasText: title });
    await proposal.locator('select[name="decision"]').selectOption('published');
    await proposal.getByRole('button', { name: fr.review.decide }).click();
    // Decided proposals leave the queue.
    await expect(proposal).toHaveCount(0);

    const slug = title
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');
    await venue.goto(`/fr/events/${slug}`);
    await expect(venue.getByRole('heading', { level: 1 })).toHaveText(title);
  });

  test('a blog post published in fr and translated to ar is linked with hreflang', async ({
    browser,
  }) => {
    const owner = await newSignedInPage(browser, demoUsers.artist);
    const word = token();
    await owner.goto(`/fr/account/profiles/${DEMO_BLOG_ID}/posts`);
    const create = owner.getByTestId('create-post');
    await create.locator('select[name="postLocale"]').selectOption('fr');
    await create.locator('input[name="title"]').fill(`Billet e2e ${word}`);
    await create.getByRole('button', { name: fr.blogEditor.create }).click();
    await expect(owner).toHaveURL(/\/posts\/[0-9a-f-]{36}$/);

    const text = owner.getByTestId('post-text');
    await text.locator('textarea[name="body"]').fill('Un **billet** de test.');
    await text.getByRole('button', { name: fr.profiles.save }).click();
    await expect(text.getByRole('status')).toHaveText(fr.forms.notices.saved);
    const slug = await text.locator('input[name="slug"]').inputValue();
    await owner
      .getByTestId('post-status')
      .getByRole('button', { name: fr.blogEditor.publish })
      .click();
    await expect(owner.getByTestId('post-status').getByRole('status')).toHaveText(
      fr.forms.notices.published,
    );

    const translate = owner.getByTestId('add-translation');
    await translate.locator('select[name="postLocale"]').selectOption('ar');
    await translate.locator('input[name="title"]').fill(`تدوينة ${word}`);
    await translate.getByRole('button', { name: fr.blogEditor.addTranslation }).click();
    await expect(owner.getByRole('heading', { level: 1 })).toHaveText(`تدوينة ${word}`);
    await owner
      .getByTestId('post-status')
      .getByRole('button', { name: fr.blogEditor.publish })
      .click();
    await expect(owner.getByTestId('post-status').getByRole('status')).toHaveText(
      fr.forms.notices.published,
    );

    await owner.goto(`/fr/blogs/demo-carnet-sonore/${slug}`);
    await expect(owner.locator('link[rel="alternate"][hreflang="ar"]')).toHaveAttribute(
      'href',
      new RegExp(`/ar/blogs/demo-carnet-sonore/${slug}$`),
    );
    await owner.locator('article').getByRole('link', { name: fr.localeNames.ar }).click();
    await expect(owner).toHaveURL(`/ar/blogs/demo-carnet-sonore/${slug}`);
    await expect(owner.getByRole('heading', { level: 1 })).toHaveText(`تدوينة ${word}`);
  });
});
