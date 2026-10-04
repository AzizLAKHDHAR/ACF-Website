# Roadmap

Each phase is meant to be **one working session that ends in one pull request**. A phase is done
when every acceptance criterion is checked *and* the shared definition of done is met. If a session
can't finish its phase, it still ends with a PR that lists what's left, and the next session
continues the same phase.

## Definition of done (every phase)

- [ ] CI is green (lint, typecheck, unit, e2e, RLS tests as they exist at that phase).
- [ ] Every new user-facing string exists in `ar`, `fr` and `en`; every new screen is checked in RTL (`ar`) and LTR.
- [ ] Every new table has RLS enabled, policies matching [`roles.md`](roles.md), and pgTAP tests (allowed **and** denied cases).
- [ ] Docs updated where reality changed (`architecture.md`, `roles.md`, `brand.md`, `CLAUDE.md` commands).
- [ ] Decisions appended to [`decisions.md`](decisions.md).
- [ ] PR opened with summary, verification steps, assumptions and open questions.

## Phase 0: Planning and configuration ✅ (AzizLAKHDHAR/ACF-Website#1)

Audit, `CLAUDE.md`, vision, roles, architecture, brand, roadmap, decisions log, MCP servers, session
setup hook.

## Phase 1: Foundation ✅ (except the live Workers deploy — see D-032)

**Goal:** replace the legacy Vite SPA with an empty but production-shaped Next.js app: trilingual,
RTL-ready, themed, deployable.

Scope: Next.js 16 (App Router) + React 19 + TypeScript 6 strict; Tailwind v4; shadcn/ui regenerated;
next-intl (`ar`, `fr`, `en`); design tokens per [`brand.md`](brand.md) (placeholders if the charter isn't
in yet); layout shell; route-group skeletons; ESLint + Prettier; Vitest + Playwright baseline; CI
workflow; deployment spike on Cloudflare Workers; delete legacy files (list in [`audit.md`](audit.md)).

Acceptance criteria:
- [x] `npm run dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:e2e` exist and pass locally and in CI (`.github/workflows/ci.yml`).
- [x] All Vite / GitHub Pages files and the dead code listed in the audit are removed. One lockfile (`package-lock.json`). The artist list and memorial image moved to `docs/legacy/` pending decisions.
- [x] `tsconfig.json` has `"strict": true` (plus `noUncheckedIndexedAccess`). No `any` in app code (lint rule). ESLint has no warnings.
- [x] `/` redirects to a locale. `/ar` renders `<html lang="ar" dir="rtl">`; `/fr` and `/en` render LTR.
- [x] The locale switcher keeps the current path and persists the choice (`NEXT_LOCALE`, one year).
- [x] `messages/ar.json`, `fr.json` and `en.json` have identical key sets (CI check). The shell has no hard-coded UI strings (lint rule).
- [x] Design tokens live in `globals.css` (primitives → semantic → `@theme inline`). Components use only token classes (default palette removed). An automated check covers token-pair contrast (AA).
- [x] Layout shell: header with public navigation, mobile drawer, footer, skip link, visible focus states. Menus work with keyboard and touch. Correct in RTL (screenshots in `docs/screenshots/phase-1/`).
- [x] Route groups `(public)`, `(auth)`, `(account)`, `(member)`, `(board)`, `(admin)` exist with placeholder pages. Hidden areas are `noindex` and return 404 until auth lands in phase 2.
- [x] Localized `not-found` and `error` pages (404 content renders client-side in Next 16.3 — D-036).
- [x] Lighthouse (mobile) ≥ 90 for Performance, Accessibility, Best Practices and SEO on the home page, in all three locales (scores in D-032).
- [ ] The shell is deployed to Cloudflare Workers via OpenNext (preview URL in the PR). Compressed bundle size and a CPU-time sample are recorded in `decisions.md`, along with the **final hosting decision** (Workers or Vercel Hobby).
  *Partly done:* bundle size (1.54 MiB gzip), a local `workerd` run and the hosting decision are recorded (D-031, D-032); the live deploy and a real CPU-time sample need a Cloudflare account (deploy workflow ready).
- [x] `.env.example` lists every variable from [`architecture.md`](architecture.md#configuration-envexample-in-phase-1) (unit-tested). README rewritten for ACF.

Inputs needed: brand charter (or OK to proceed with placeholders), default locale, Cloudflare account.

## Phase 2: Data model, auth, RLS, seed data

**Goal:** the complete v1 schema, secured and tested, with working authentication.

Scope: Supabase CLI setup; migrations for all tables, enums, functions, triggers and storage buckets in
[`architecture.md`](architecture.md#6-data-model-draft); RLS policies for the full
[`roles.md`](roles.md) matrix; pgTAP suite; generated types; Supabase clients
(server/browser/public/admin); auth pages and flows; `proxy.ts`; route guards; Turnstile; seed data.

Acceptance criteria:
- [ ] `supabase db reset` builds the schema from scratch and seeds it without errors.
- [ ] A pgTAP test proves **every** table in `public` has RLS enabled with policies.
- [ ] The pgTAP RLS matrix covers every row of `roles.md` for anonymous, registered, profile manager, member, board and admin, with both allowed and denied cases, and runs green in CI.
- [ ] Guard rails are tested: no self-escalation, last-admin protection, audit-log immutability, correspondence transitions, closed ledger periods, volunteer capacity under concurrent sign-ups.
- [ ] Storage policies are tested: public bucket writes only into own folder; private buckets unreadable by lower roles.
- [ ] `src/types/database.ts` is generated and committed. A CI step fails if it's stale.
- [ ] Sign-up (with email confirmation), sign-in (password and magic link), sign-out and password reset work end to end (Playwright, mailbox mocked or Inbucket locally).
- [ ] An `accounts` row is created automatically on sign-up with the sign-up locale.
- [ ] `requireUser` / `requireRole` guard all `(account)`, `(member)`, `(board)` and `(admin)` layouts. E2E proves a registered user gets 404 on `/member`, a member gets 404 on `/board`, and a board user gets 404 on `/admin`.
- [ ] Lint rule: the service-role client can't be imported outside the allowed paths.
- [ ] Supabase database linter / security advisors report no errors.
- [ ] Seed: real taxonomies (11 genres, professions, 24 governorates in 3 languages) and **clearly fictional** demo users for each role with sample content in 3 languages. No real personal data in seed.
- [ ] Admin bootstrap documented (how the first admin is created).

Inputs needed: Supabase dev project and access token, Resend domain (or accept the default SMTP limits on dev), Turnstile keys.

## Phase 3: Public site

**Goal:** the public window: every public page backed by the database, in three languages.

Scope: home; news; blogs; catalogues of artists, professionals, venues and studios with filters and
search; events (upcoming/past, filters); detail pages; about, contact, privacy, terms; SEO (metadata,
`sitemap.xml` with `hreflang`, robots, OG images, JSON-LD); click-to-load media embeds.

Acceptance criteria:
- [ ] No hard-coded content: every list and detail page reads from Supabase.
- [ ] Only `approved` profiles and `published` posts/events are visible. E2E seeds a draft and asserts it's absent everywhere, including sitemap and search.
- [ ] Filters: genre, governorate, profile type, date range for events. Full-text search across profiles and events works for Arabic and Latin names.
- [ ] Pages are statically cached and revalidated by tag when content is published or approved (verified: publish → visible without redeploy).
- [ ] `sitemap.xml` lists every public URL in all locales with `hreflang` alternates. Hidden areas are excluded.
- [ ] JSON-LD validates (MusicGroup/Person, MusicVenue/Place, Event, Article).
- [ ] Contact form (Turnstile) emails ACF and stores nothing sensitive.
- [ ] axe: no serious/critical violations on any public template in `ar` and `fr`. Lighthouse ≥ 90 on home, catalogue and detail pages.
- [ ] Embeds don't load third-party scripts until the user clicks.

Inputs needed: About/mission text in 3 languages, contact address, legal texts (or OK to draft), decision on migrating legacy content.

## Phase 4: Profile onboarding and admin approval

**Goal:** scene actors create and manage their own public profiles; the admin reviews them.

Scope: `/account/profiles` for all five types (several per user); co-managers; media uploads
with size/MIME limits and resizing; submit for review; `/admin/approvals` queue; review history and
emails; event proposals by approved artists/venues; blog post editor for approved blog owners (per-locale
versions); claim flow for seeded profiles (if chosen).

Acceptance criteria:
- [ ] E2E: register → create an artist profile in Arabic → submit → admin approves → profile visible at `/ar/artists/{slug}` and in the catalogue.
- [ ] E2E: rejection with a public note → the owner sees the note and can resubmit.
- [ ] One user can own an artist **and** a studio profile and switch between them. A co-manager can edit; a non-manager can't (RLS test + e2e).
- [ ] Uploads outside the user's own profile folder are denied (storage test). Oversized or wrong-type files are rejected with a localized message.
- [ ] Approval and rejection emails are sent in each manager's preferred locale (template snapshot tests).
- [ ] An approved venue can propose an event at its venue; the board publishes it; the event appears publicly.
- [ ] An approved blog owner publishes a post in `fr` and its `ar` translation, linked with `hreflang`.
- [ ] Every status change writes `review_events` and `audit_log`.

Inputs needed: required fields per profile type, review criteria, whether edits to approved profiles need re-approval, whether to seed legacy artists.

## Phase 5: Member space

**Goal:** members coordinate on the site.

Scope: member dashboard; meetings and RSVP; tasks (view, assigned, status updates, self-assign open
tasks, comments); announcements feed (board posts; Discord sync arrives in phase 8); availability
polls; volunteer shifts with capacity; document library (signed URLs); member directory. Also the
board-side forms that feed these features (create meeting, announcement, poll, shift, upload library
document). Task creation and assignment come in phase 6; phase 5 uses seeded tasks.

Acceptance criteria:
- [ ] A member can RSVP yes/maybe/no and change it. The board sees the attendance list. Members see counts.
- [ ] A board-audience meeting, announcement, poll or document is invisible to members (RLS test + e2e).
- [ ] Availability poll: members vote per slot; results grid; votes locked after `closes_at` (DB-enforced).
- [ ] Volunteer sign-up respects capacity under concurrency (DB test with parallel sign-ups); members can cancel their own sign-up.
- [ ] Library downloads use signed URLs that expire. Direct storage URLs are denied.
- [ ] Tasks: a member sees members-visible and assigned tasks, can change the status of assigned tasks, and can self-assign `is_open` tasks only.
- [ ] In-app notifications for new announcements, assignments and meetings.
- [ ] All member screens pass axe in `ar` and `fr`.

## Phase 6: Board space

**Goal:** the board runs the association on the site.

Scope: task creation and assignment; projects and budgets; ledger with periods, reversal entries,
receipts, budget-vs-actual; CSV/XLSX exports; legal vault with versioning; correspondence tracker
(reference codes, documents, emailing from the tracker, status machine, timeline, overdue flags,
signature step in `manual` mode).

Acceptance criteria:
- [ ] Board can create, edit, assign and close tasks; assignees are notified.
- [ ] Amounts are stored as integer millimes and round-trip exactly (`1 234,567 TND`). Unit tests cover formatting in all locales.
- [ ] Entries in a closed period can't be changed or deleted (DB test); corrections are reversal entries.
- [ ] Budget vs actual per project equals the sum of linked entries (unit test against fixtures).
- [ ] Exports (CSV and XLSX, per period or project) total exactly to the ledger. Receipts are listed with links.
- [ ] Members and registered users can't read any finance, vault or correspondence row or file (RLS + storage tests).
- [ ] Correspondence: invalid transitions are rejected by the database; each transition creates a timeline event; sending an email from the tracker stores the message id; `archived` is read-only.
- [ ] Every board write is in `audit_log`.

Inputs needed: chart of accounts / expense categories, fiscal year, export format expected by ACF's accountant, correspondence reference-code format, the supervising authority's official name and email.

## Phase 7: Admin dashboard

**Goal:** the admin manages people, content and settings.

Scope: users and roles (grant/revoke, invitations, deactivate); moderation queue (reports, unpublish,
suspend); audit log viewer with filters; analytics (SQL views, storage usage, cron health); site
settings editor; integrations status page.

Acceptance criteria:
- [ ] Granting or revoking a role changes access on the next request (e2e: promote to board → `/board` opens; revoke → 404).
- [ ] The last admin can't be demoted or deactivated (DB-enforced, with a clear UI message).
- [ ] Invitations: invite by email → first sign-in with that verified email attaches the role. Expired tokens fail.
- [ ] Moderation: a report can be resolved by unpublishing or suspending the target. The target owner is notified.
- [ ] Audit log viewer filters by actor, table, action and date. Spot-check that privileged actions from phases 4–6 appear.
- [ ] Analytics numbers match SQL fixtures (tests). Storage usage is shown against the 1 GB free quota.
- [ ] Site settings: public keys are reflected on the public site after save (revalidation); private keys never reach the client bundle.
- [ ] All `/admin` routes return 404 for board users (e2e).

## Phase 8: Integrations

**Goal:** the platform talks to the outside world.

Scope: Resend in production (domain, Supabase SMTP, all localized templates); scheduled jobs (GitHub
Actions → `/api/cron/*`); reminders (meetings, shifts, tasks due) and daily admin digest; Discord
outbound webhooks and inbound sync; e-signature adapter (if a provider is chosen) and webhook; nightly
encrypted backups and a restore drill.

Acceptance criteria:
- [ ] Cron endpoints reject a missing or wrong `CRON_SECRET` (test). Each job is idempotent: running it twice sends each notification once (test).
- [ ] Meeting reminders arrive about 24 h and about 2 h before, in the recipient's language. Shift reminders arrive about 24 h before.
- [ ] Discord: a board announcement marked "post to Discord" appears in the channel without pinging anyone; a message posted in the channel appears in the member feed within 15 minutes; edits sync; no duplicates (our own webhook posts are skipped).
- [ ] E-signature: `manual` mode works end to end. If a provider is chosen, a sandbox document goes sent → signed via the webhook, and the signed PDF lands in the vault.
- [ ] Webhook signature verification rejects tampered payloads (test).
- [ ] The backup workflow produces an encrypted dump. A **restore drill** into a scratch database succeeds and is documented in the runbook.
- [ ] The admin integrations page shows the last successful run of each job and the Discord sync cursor.

Inputs needed: domain DNS access, Discord server (channel IDs, webhook, bot application), signature provider decision, backup key holder(s).

## Phase 9: Tests, SEO, security review, deploy

**Goal:** production launch.

Scope: close test gaps; accessibility and performance audits; SEO review; security review; legal pages;
production Supabase project, domain, DNS and email authentication; production deploy; monitoring;
runbook and handover.

Acceptance criteria:
- [ ] The RLS matrix tests cover 100% of `roles.md`. E2E covers the critical journeys (sign-up, onboarding + approval, RSVP, volunteer sign-up, ledger entry + export, correspondence lifecycle, role change) in all three locales.
- [ ] Security review done (`/security-review`, OWASP checklist): CSP and security headers, rate limits and Turnstile, Supabase security advisors clean, secret scan clean, no service-role usage outside allowed paths, MFA decision implemented.
- [ ] `npm audit --omit=dev` reports no high or critical vulnerabilities.
- [ ] Accessibility: axe clean, plus a manual keyboard and screen-reader pass (VoiceOver/TalkBack) in `ar` and `fr`.
- [ ] Lighthouse ≥ 90 in all categories on home, a catalogue page, a profile page and an event page, in all three locales.
- [ ] SEO: metadata, canonical URLs, `hreflang`, sitemap submitted, structured data validated.
- [ ] Privacy policy and terms published in three languages and reviewed by ACF.
- [ ] Production: prod Supabase project with migrations applied through the approval workflow, domain on HTTPS, SPF/DKIM/DMARC passing, first admin created, backups running, restore drill done on prod data.
- [ ] Error monitoring set up (free tier). The runbook covers deploy, rollback, restore, key rotation, adding or removing an admin, and recovering a paused project.
- [ ] Launch checklist signed off by ACF.
