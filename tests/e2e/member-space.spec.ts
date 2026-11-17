import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { messages } from './helpers';
import { DEMO_PASSWORD, demoUsers, insertAsService, publicStorageUrl, signIn } from './supabase';

// Phase 5 member space: meetings and answers, board-only content, availability polls, volunteer
// shifts, the document library, tasks, announcements and in-app notifications, and axe on every
// member screen. The suites share one database and run in parallel, so every test creates its own
// rows with a unique token, and the tests that change data run once (desktop).

const { ar, fr } = messages;
const MEMBER_NAME = 'عضو تجريبي'; // the demo member's display name (seed)
const wcag = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

function token(): string {
  return Math.random().toString(36).slice(2, 8);
}

/** A `datetime-local` value `days` from now, in Tunis time (UTC+1). */
function inDays(days: number, hours = 0): string {
  return new Date(Date.now() + days * 86_400_000 + (hours + 1) * 3_600_000)
    .toISOString()
    .slice(0, 16);
}

/** A signed-in page in its own context; native confirm dialogs are accepted. */
async function signedIn(browser: Browser, email: string, locale: 'ar' | 'fr' = 'fr') {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('dialog', (dialog) => void dialog.accept());
  await signIn(page, email, DEMO_PASSWORD, locale);
  await expect(page).toHaveURL(`/${locale}/account`);
  return page;
}

/** Submits an ActionForm and waits for its success notice. */
async function submit(form: ReturnType<Page['locator']>, button: string, notice: string) {
  await form.getByRole('button', { name: button, exact: true }).click();
  await expect(form.getByRole('status')).toHaveText(notice);
}

/**
 * Submits a form that disappears once its action succeeds (taking a task, cancelling a meeting,
 * closing a poll, marking a notification read): the caller checks the outcome instead.
 */
async function press(scope: ReturnType<Page['locator']>, button: string) {
  const control = scope.getByRole('button', { name: button, exact: true });
  await control.click();
  await expect(control).toHaveCount(0);
}

async function createMeeting(board: Page, title: string, audience: 'member' | 'board' = 'member') {
  await board.goto('/fr/board/meetings');
  const form = board.getByTestId('meeting-form');
  await form.locator('input[name="title"]').fill(title);
  await form.locator('input[name="startsAt"]').fill(inDays(6));
  await form.locator('input[name="location"]').fill('Lieu fictif');
  await form.getByLabel(fr.memberSpace.audience.label).selectOption(audience);
  await submit(form, fr.memberSpace.board.meetings.create, fr.forms.notices.created);
}

test.describe('member space', () => {
  test.skip(({ isMobile }) => isMobile, 'changes shared data; runs once, on desktop');

  test('a member answers a meeting and changes it; the board sees the attendance list', async ({
    browser,
  }) => {
    const title = `Assemblée e2e ${token()}`;
    const board = await signedIn(browser, demoUsers.board);
    await createMeeting(board, title);

    // The member answers in Arabic, then changes their mind.
    const member = await signedIn(browser, demoUsers.member, 'ar');
    await member.goto('/ar/member/meetings');
    await member.getByRole('link', { name: title }).click();
    await expect(member.locator('h1')).toHaveText(title);
    const rsvp = member.getByTestId('rsvp-form');
    await rsvp
      .getByRole('radio', { name: ar.memberSpace.meetings.answers.yes, exact: true })
      .check();
    await submit(rsvp, ar.memberSpace.meetings.save, ar.forms.notices.answered);
    await expect(member.getByTestId('rsvp-count-yes')).toHaveText('1');
    // The page refreshes after each answer (revalidatePath), so the counts follow without a reload.
    await rsvp
      .getByRole('radio', { name: ar.memberSpace.meetings.answers.maybe, exact: true })
      .check();
    await rsvp.getByRole('button', { name: ar.memberSpace.meetings.save, exact: true }).click();
    await expect(member.getByTestId('rsvp-count-maybe')).toHaveText('1');
    await expect(member.getByTestId('rsvp-count-yes')).toHaveText('0');
    await member.reload();
    await expect(member.getByTestId('rsvp-count-maybe')).toHaveText('1');
    await expect(member.getByTestId('attendance')).toHaveCount(0);
    const meetingUrl = member.url().replace('/ar/', '/fr/');

    // The board reads who answered what.
    await board.goto(meetingUrl);
    const attendance = board.getByTestId('attendance');
    await expect(attendance).toContainText(MEMBER_NAME);
    await expect(attendance).toContainText(fr.memberSpace.meetings.answers.maybe);

    // The member was notified of the new meeting.
    await member.goto('/ar/account/notifications');
    await expect(
      member.locator('[data-kind="meeting_scheduled"]').filter({ hasText: title }),
    ).toBeVisible();

    // Cancelled meetings stop taking answers.
    await board.goto('/fr/board/meetings');
    const card = board.getByTestId('meeting').filter({ hasText: title });
    await press(card, fr.memberSpace.board.meetings.cancel);
    await expect(card.getByText(fr.memberSpace.meetings.cancelled)).toBeVisible();
    await member.goto(meetingUrl.replace('/fr/', '/ar/'));
    await expect(member.getByText(ar.memberSpace.meetings.cancelled).first()).toBeVisible();
    await expect(member.getByTestId('rsvp-form')).toHaveCount(0);
  });

  test('board-only meetings, announcements, polls and documents stay invisible to members', async ({
    browser,
  }) => {
    const id = token();
    const board = await signedIn(browser, demoUsers.board);
    await createMeeting(board, `Bureau e2e ${id}`, 'board');

    await board.goto('/fr/board/announcements');
    const announcement = board.getByTestId('announcement-form');
    await announcement.locator('input[name="title"]').fill(`Note bureau e2e ${id}`);
    await announcement.locator('textarea[name="body"]').fill('Texte réservé au bureau.');
    await announcement.getByLabel(fr.memberSpace.audience.label).selectOption('board');
    await submit(
      announcement,
      fr.memberSpace.board.announcements.publish,
      fr.forms.notices.published,
    );

    await board.goto('/fr/board/polls');
    const poll = board.getByTestId('poll-form');
    await poll.locator('input[name="title"]').fill(`Sondage bureau e2e ${id}`);
    await poll.getByLabel(fr.memberSpace.audience.label).selectOption('board');
    await poll.locator('input[name="options.0.label"]').fill('Lundi');
    await poll.locator('input[name="options.1.label"]').fill('Mardi');
    await submit(poll, fr.memberSpace.board.polls.create, fr.forms.notices.created);

    await board.goto('/fr/member/documents');
    const upload = board.getByTestId('document-upload');
    await upload.locator('input[name="file"]').setInputFiles({
      name: 'note-bureau.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Fictional board note.'),
    });
    await upload.locator('input[name="title"]').fill(`Document bureau e2e ${id}`);
    await upload.getByLabel(fr.memberSpace.audience.label).selectOption('board');
    await submit(upload, fr.memberSpace.documents.upload.submit, fr.forms.notices.uploaded);

    // The board sees everything; note the direct links for the member to try.
    await board.goto('/fr/member/meetings');
    const meetingHref = await board
      .getByRole('link', { name: `Bureau e2e ${id}` })
      .getAttribute('href');
    await board.goto('/fr/member/documents');
    const documentHref = await board
      .getByTestId('document')
      .filter({ hasText: `Document bureau e2e ${id}` })
      .getByTestId('document-download')
      .getAttribute('href');
    expect(meetingHref).toBeTruthy();
    expect(documentHref).toBeTruthy();

    const member = await signedIn(browser, demoUsers.member);
    for (const [path, text] of [
      ['/fr/member/meetings', `Bureau e2e ${id}`],
      ['/fr/member/announcements', `Note bureau e2e ${id}`],
      ['/fr/member/polls', `Sondage bureau e2e ${id}`],
      ['/fr/member/documents', `Document bureau e2e ${id}`],
      ['/fr/member', `Note bureau e2e ${id}`],
    ] as const) {
      await member.goto(path);
      await expect(member.locator('h1')).toBeVisible();
      await expect(member.getByText(text)).toHaveCount(0);
    }
    expect((await member.goto(meetingHref ?? ''))?.status()).toBe(404);
    expect((await member.request.get(documentHref ?? '', { maxRedirects: 0 })).status()).toBe(404);
  });

  test('a member votes in an availability poll; votes lock once it closes', async ({ browser }) => {
    const id = token();
    const title = `Répétition e2e ${id}`;
    const board = await signedIn(browser, demoUsers.board);
    await board.goto('/fr/board/polls');
    const form = board.getByTestId('poll-form');
    await form.locator('input[name="title"]').fill(title);
    await form.locator('input[name="closesAt"]').fill(inDays(5));
    await form.locator('input[name="options.0.startsAt"]').fill(inDays(8));
    await form.locator('input[name="options.0.label"]').fill(`Samedi ${id}`);
    await form.locator('input[name="options.1.label"]').fill(`Dimanche ${id}`);
    await submit(form, fr.memberSpace.board.polls.create, fr.forms.notices.created);

    const member = await signedIn(browser, demoUsers.member);
    await member.goto('/fr/member/polls');
    await member.getByRole('link', { name: title }).click();
    const vote = member.getByTestId('vote-form');
    await vote
      .getByRole('group', { name: new RegExp(`Samedi ${id}`) })
      .getByRole('radio', { name: fr.memberSpace.polls.values.yes, exact: true })
      .check();
    await vote
      .getByRole('group', { name: new RegExp(`Dimanche ${id}`) })
      .getByRole('radio', { name: fr.memberSpace.polls.values.maybe, exact: true })
      .check();
    await submit(vote, fr.memberSpace.polls.save, fr.forms.notices.voted);
    await member.reload();
    const results = member.getByTestId('results');
    await expect(results.getByRole('row', { name: new RegExp(MEMBER_NAME) })).toContainText(
      fr.memberSpace.polls.values.yes,
    );
    await expect(results).toContainText(fr.memberSpace.polls.best);

    await board.goto('/fr/board/polls');
    const card = board.getByTestId('board-poll').filter({ hasText: title });
    await press(card, fr.memberSpace.board.polls.close);
    await expect(card.getByText(fr.memberSpace.polls.closed, { exact: true })).toBeVisible();

    await member.reload();
    await expect(member.getByTestId('vote-form')).toHaveCount(0);
    await expect(member.getByText(fr.memberSpace.polls.locked)).toBeVisible();
    await expect(member.getByTestId('results')).toContainText(MEMBER_NAME);
  });

  test('a member signs up for a volunteer shift and gives the place back', async ({ browser }) => {
    const role = `Accueil e2e ${token()}`;
    const board = await signedIn(browser, demoUsers.board);
    await board.goto('/fr/board/volunteering');
    const form = board.getByTestId('shift-form');
    await form.locator('input[name="role_fr"]').fill(role);
    await form.locator('input[name="startsAt"]').fill(inDays(9));
    await form.locator('input[name="endsAt"]').fill(inDays(9, 2));
    await form.locator('input[name="capacity"]').fill('1');
    await submit(form, fr.memberSpace.board.volunteering.create, fr.forms.notices.created);

    const member = await signedIn(browser, demoUsers.member);
    await member.goto('/fr/member/volunteer');
    const shift = member.getByTestId('shift').filter({ hasText: role });
    await submit(shift, fr.memberSpace.volunteer.signUp, fr.forms.notices.signedUp);
    await member.reload();
    await expect(shift.getByText(fr.memberSpace.volunteer.youreIn)).toBeVisible();
    await expect(shift.getByTestId('shift-places')).toContainText('1');

    await board.reload();
    await expect(board.getByTestId('board-shift').filter({ hasText: role })).toContainText(
      MEMBER_NAME,
    );

    await submit(shift, fr.memberSpace.volunteer.cancel, fr.forms.notices.signupCancelled);
    await member.reload();
    await expect(shift.getByText(fr.memberSpace.volunteer.youreIn)).toHaveCount(0);
    await expect(
      shift.getByRole('button', { name: fr.memberSpace.volunteer.signUp }),
    ).toBeVisible();
  });

  test('library downloads go through short-lived signed URLs; the bucket refuses direct links', async ({
    browser,
  }) => {
    const title = `Guide e2e ${token()}`;
    const content = `Fictional library document ${title}`;
    const board = await signedIn(browser, demoUsers.board);
    await board.goto('/fr/member/documents');
    const upload = board.getByTestId('document-upload');
    await upload.locator('input[name="file"]').setInputFiles({
      name: 'Guide des bénévoles.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(content),
    });
    await upload.locator('input[name="title"]').fill(title);
    await submit(upload, fr.memberSpace.documents.upload.submit, fr.forms.notices.uploaded);

    const member = await signedIn(browser, demoUsers.member, 'ar');
    await member.goto('/ar/member/documents');
    const link = member
      .getByTestId('document')
      .filter({ hasText: title })
      .getByTestId('document-download');
    const href = await link.getAttribute('href');
    const response = await member.request.get(href ?? '', { maxRedirects: 0 });
    expect(response.status()).toBe(303);
    const signedUrl = response.headers().location ?? '';
    expect(signedUrl).toMatch(/\/storage\/v1\/object\/sign\/member-documents\/library\/.+\?token=/);
    expect(response.headers()['cache-control']).toContain('no-store');

    const file = await member.request.get(signedUrl);
    expect(file.status()).toBe(200);
    expect(await file.text()).toBe(content);

    const path = decodeURIComponent(
      new URL(signedUrl).pathname.split('/storage/v1/object/sign/member-documents/')[1] ?? '',
    );
    expect(path).toMatch(/^library\/[0-9a-f-]{36}\/guide-des-benevoles\.txt$/);
    expect((await member.request.get(publicStorageUrl('member-documents', path))).ok()).toBe(false);
  });

  test('a member takes an open task, moves its status and comments', async ({ browser }) => {
    const title = `Tâche e2e ${token()}`;
    const task = await insertAsService<{ id: string }>('tasks', {
      title,
      description_md: 'Tâche fictive créée par le test e2e.',
      audience: 'member',
      is_open: true,
    });
    const closedTask = await insertAsService<{ id: string }>('tasks', {
      title: `${title} (fermée)`,
      audience: 'member',
      is_open: false,
    });

    const member = await signedIn(browser, demoUsers.member);
    await member.goto('/fr/member/tasks');
    const open = member.locator('section[aria-labelledby="open-tasks"]');
    const card = open.getByTestId('task').filter({ hasText: title });
    // Taking the task moves it to "my tasks", so its button goes away.
    await press(card, fr.memberSpace.tasks.take);
    await member.reload();
    await expect(
      member.locator('section[aria-labelledby="my-tasks"]').getByRole('link', { name: title }),
    ).toBeVisible();

    await member.goto(`/fr/member/tasks/${task.id}`);
    await expect(member.getByTestId('task-assignees')).toContainText(MEMBER_NAME);
    const status = member.getByTestId('task-status-form');
    await status.getByLabel(fr.memberSpace.tasks.statusLabel).selectOption('in_progress');
    await submit(status, fr.memberSpace.tasks.saveStatus, fr.forms.notices.statusChanged);
    await member.reload();
    await expect(member.getByTestId('task-status').first()).toHaveText(
      fr.memberSpace.tasks.status.in_progress,
    );

    const comment = `Je m’en occupe ${token()}`;
    const form = member.getByTestId('comment-form');
    await form.getByLabel(fr.memberSpace.tasks.commentLabel).fill(comment);
    await submit(form, fr.memberSpace.tasks.addComment, fr.forms.notices.commented);
    await member.reload();
    await expect(member.getByTestId('task-comment').filter({ hasText: comment })).toBeVisible();

    // A members' task that isn't open and isn't theirs: readable, but they can't take or move it.
    await member.goto(`/fr/member/tasks/${closedTask.id}`);
    await expect(member.locator('h1')).toHaveText(`${title} (fermée)`);
    await expect(member.getByTestId('task-status-form')).toHaveCount(0);
    await expect(member.getByRole('button', { name: fr.memberSpace.tasks.take })).toHaveCount(0);
  });

  test('a board announcement reaches the members’ feed and their notifications', async ({
    browser,
  }) => {
    const title = `Annonce e2e ${token()}`;
    const board = await signedIn(browser, demoUsers.board);
    await board.goto('/fr/board/announcements');
    const form = board.getByTestId('announcement-form');
    await form.locator('input[name="title"]').fill(title);
    await form.locator('textarea[name="body"]').fill('Un **message** fictif pour les membres.');
    await submit(form, fr.memberSpace.board.announcements.publish, fr.forms.notices.published);

    const member = await signedIn(browser, demoUsers.member, 'ar');
    await member.goto('/ar/member/announcements');
    const item = member.getByTestId('announcement').filter({ hasText: title });
    await expect(item.locator('strong')).toHaveText('message');

    await member.goto('/ar/account/notifications');
    const notification = member
      .locator('[data-kind="announcement_published"]')
      .filter({ hasText: title });
    await expect(notification).toHaveAttribute('data-unread', 'true');
    await press(notification, ar.notifications.markRead);
    await member.reload();
    await expect(
      member.locator('[data-kind="announcement_published"]').filter({ hasText: title }),
    ).toHaveAttribute('data-unread', 'false');

    // Hidden announcements leave the members' feed.
    await board.reload();
    const card = board.getByTestId('announcement').filter({ hasText: title });
    await submit(card, fr.memberSpace.board.announcements.hide, fr.forms.notices.hidden);
    await member.goto('/ar/member/announcements');
    await expect(member.getByText(title)).toHaveCount(0);
  });
});

/** Every member screen (detail pages through the seed's meeting, poll and task). */
async function memberPages(page: Page, locale: 'ar' | 'fr'): Promise<string[]> {
  const pages = [
    '/member',
    '/member/meetings',
    '/member/tasks',
    '/member/announcements',
    '/member/polls',
    '/member/volunteer',
    '/member/documents',
    '/member/directory',
    '/account/notifications',
  ].map((path) => `/${locale}${path}`);
  const detail = async (list: string, name: string) => {
    await page.goto(`/${locale}${list}`);
    const href = await page.getByRole('link', { name }).first().getAttribute('href');
    if (href) pages.push(href);
  };
  await detail('/member/meetings', 'Assemblée de démonstration');
  await detail('/member/polls', 'Date de la répétition (démo)');
  await detail('/member/tasks', 'Contacter les bénévoles (démo)');
  return pages;
}

test.describe('accessibility of the member space (axe, WCAG 2.2 A/AA)', () => {
  for (const colorScheme of ['light', 'dark'] as const) {
    for (const locale of ['ar', 'fr'] as const) {
      test(`member screens, ${locale}, ${colorScheme}`, async ({ browser, isMobile, viewport }) => {
        const context = await browser.newContext({ colorScheme, isMobile, viewport });
        const page = await context.newPage();
        await signIn(page, demoUsers.member, DEMO_PASSWORD, locale);
        await expect(page).toHaveURL(`/${locale}/account`);
        for (const path of await memberPages(page, locale)) {
          await page.goto(path);
          await expect(page.locator('h1')).toBeVisible();
          await expect(page.locator('html')).toHaveAttribute(
            'dir',
            locale === 'ar' ? 'rtl' : 'ltr',
          );
          const results = await new AxeBuilder({ page }).withTags(wcag).analyze();
          expect(
            results.violations.map(
              (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
            ),
            path,
          ).toEqual([]);
        }
        await context.close();
      });

      test(`board forms, ${locale}, ${colorScheme}`, async ({ browser, isMobile, viewport }) => {
        const context = await browser.newContext({ colorScheme, isMobile, viewport });
        const page = await context.newPage();
        await signIn(page, demoUsers.board, DEMO_PASSWORD, locale);
        await expect(page).toHaveURL(`/${locale}/account`);
        for (const path of [
          '/board/meetings',
          '/board/announcements',
          '/board/polls',
          '/board/volunteering',
        ]) {
          await page.goto(`/${locale}${path}`);
          await expect(page.locator('h1')).toBeVisible();
          const results = await new AxeBuilder({ page }).withTags(wcag).analyze();
          expect(
            results.violations.map(
              (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
            ),
            path,
          ).toEqual([]);
        }
        await context.close();
      });
    }
  }
});
