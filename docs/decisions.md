# Decisions log

Append-only record of decisions. **Every session appends its decisions here, in the same PR.**
Never rewrite an old entry; supersede it with a new one (`Status: superseded by D-0xx`) and update the
old entry's status line only.

Format:

```
## D-NNN: Title
- Date: YYYY-MM-DD · Phase: N · Status: accepted | proposed | superseded by D-NNN
- Context: why a decision was needed (one or two sentences, alternatives considered)
- Decision: what we do
- Consequences: what follows, what to watch
```

---

## D-001: Rebuild from scratch rather than migrate the legacy SPA
- Date: 2026-10-04 · Phase: 0 · Status: accepted
- Context: The existing code is a Vite/React 18 SPA with mock data, no backend, no i18n, broken lint and
  typecheck, and 18 vulnerable production dependencies ([`audit.md`](audit.md)). The target stack differs at every layer.
- Decision: Start a fresh Next.js app in phase 1. Keep only the information architecture, the genre
  taxonomy and (pending consent) the artist name list as inputs.
- Consequences: Legacy files are deleted in phase 1. Nothing from `src/` is ported line by line.

## D-002: Next.js 16 App Router, React 19, TypeScript 6.0.x
- Date: 2026-10-04 · Phase: 0 · Status: accepted
- Context: Next.js 16.3 is current. TypeScript 7.0 is released, but `typescript-eslint` (8.71) supports
  TypeScript `<6.1` only.
- Decision: Pin Next 16.3.x, React 19.x and TypeScript 6.0.x with `strict: true`. Re-evaluate TypeScript 7
  when the lint toolchain supports it.
- Consequences: Next 16 uses `proxy.ts` instead of `middleware.ts`. Its compatibility with OpenNext is verified in phase 1.

## D-003: Tailwind v4 and freshly generated shadcn/ui
- Date: 2026-10-04 · Phase: 0 · Status: accepted
- Context: The repo vendors 49 shadcn components built for Tailwind 3 and React 18; 14 are used.
- Decision: Tailwind v4 (CSS-first `@theme`); regenerate only the needed shadcn components with the CLI
  (`shadcn@4.x`); theme through CSS variables only.
- Consequences: Brand changes touch tokens, not components ([`brand.md`](brand.md)).

## D-004: npm is the only package manager
- Date: 2026-10-04 · Phase: 0 · Status: accepted
- Context: Both `package-lock.json` and `bun.lockb` are committed and can drift. npm ships with Node
  and is what most volunteers already know.
- Decision: npm with `package-lock.json`. Delete `bun.lockb` in phase 1.
- Consequences: CI and the session hook use npm.

## D-005: Locales `ar`, `fr`, `en`, always prefixed; default `ar` (provisional)
- Date: 2026-10-04 · Phase: 0 · Status: proposed (needs ACF confirmation)
- Context: All three languages are required, and Arabic is RTL. A default is needed for `/` when
  negotiation fails.
- Decision: next-intl with `localePrefix: 'always'`, negotiation by `Accept-Language` + cookie, fallback `ar`.
  Short translatable fields are `jsonb` locale maps; posts are one row per locale linked by `translation_group`.
- Consequences: Every page is reachable as `/ar/…`, `/fr/…`, `/en/…`. Changing the default later is a one-line change.

## D-006: Public profiles and association roles are separate models
- Date: 2026-10-04 · Phase: 0 · Status: accepted
- Context: A user can hold several public profile types and, independently, one association role.
- Decision: `public_profiles` holds one row per public entity (artist, professional, venue, studio,
  blog), with type-specific detail tables and a `profile_managers` join so one user can manage several
  profiles and a profile can have several managers. `memberships` holds **one hierarchical role per
  user** (`member < board < admin`), compared by rank.
- Consequences: "Venue owner" = manager of a `venue` profile. Roles never come from profile types and vice versa.

## D-007: Authorization lives in Postgres (RLS + SECURITY DEFINER functions)
- Date: 2026-10-04 · Phase: 0 · Status: accepted
- Context: Client-side role checks can't be trusted, and Server Actions are public endpoints.
- Decision: RLS on every table. Role checks read `memberships` through `private.has_role()` at query
  time, not from JWT custom claims (claims can be stale for up to an hour after a role change).
  Privileged transitions go through `SECURITY DEFINER` functions that re-check the caller. App-level
  guards exist for early errors and UX only.
- Consequences: A pgTAP suite encodes [`roles.md`](roles.md) and blocks merges. Role revocation takes effect on the next request.

## D-008: Private columns live in separate tables
- Date: 2026-10-04 · Phase: 0 · Status: accepted
- Context: RLS filters rows, not columns.
- Decision: Sensitive fields go in companion tables with stricter policies (`account_private`,
  `profile_private`, `project_budgets`).
- Consequences: Slightly more joins. No reliance on `select` lists for secrecy.

## D-009: A fifth route group, `(account)`, for signed-in users without a role
- Date: 2026-10-04 · Phase: 0 · Status: accepted
- Context: Profile owners need to create and edit profiles, but most of them are not ACF members, so
  `(member)` is the wrong place.
- Decision: Route groups `(public)`, `(auth)`, `(account)`, `(member)`, `(board)`, `(admin)`.
- Consequences: Onboarding lives at `/{locale}/account/profiles/…`.

## D-010: Hidden areas answer 404 to users without the role
- Date: 2026-10-04 · Phase: 0 · Status: accepted
- Context: "Hidden" spaces shouldn't advertise themselves.
- Decision: Signed out → redirect to login. Signed in without the role → `notFound()`. Hidden areas are `noindex`
  and disallowed in `robots.ts`.
- Consequences: E2E tests assert 404, not 403.

## D-011: Money as integer millimes; ledger corrections by reversal
- Date: 2026-10-04 · Phase: 0 · Status: accepted
- Context: The Tunisian dinar has 3 decimals. Floating-point money is unsafe, and financial history must be traceable.
- Decision: `bigint` millimes, currency TND. Closable ledger periods. Board fixes mistakes with reversal
  entries; only the admin can soft-delete (audited).
- Consequences: Formatting helpers handle 3 decimals per locale.

## D-012: Correspondence status machine enforced in the database
- Date: 2026-10-04 · Phase: 0 · Status: accepted
- Context: Exchanges with the supervising authority must be traceable.
- Decision: `draft → sent → awaiting_signature → signed → archived`, forward-only through
  `transition_correspondence()`. The admin can move an item backward (audited). Each move is written to
  `correspondence_events`. `archived` is read-only.
- Consequences: Adding a state (e.g. `cancelled`) needs a migration and a decision entry.

## D-013: Hosting: Cloudflare Workers via OpenNext first, Vercel Hobby as fallback
- Date: 2026-10-04 · Phase: 0 · Status: superseded by D-032
- Context: Both are free. Vercel Hobby is limited to non-commercial use. Workers Free has a 3 MB compressed
  bundle limit and 10 ms CPU per request.
- Decision: Build for Workers (`@opennextjs/cloudflare`), serve public pages from the ISR cache, keep
  platform-specific code in `src/lib/platform/`, and measure size and CPU in phase 1.
- Consequences: Phase 1 records measurements and the final choice here.

## D-014: Two Supabase free projects; schema changes only through CLI migrations
- Date: 2026-10-04 · Phase: 0 · Status: accepted
- Context: The free tier allows 2 projects; dashboard edits are untracked.
- Decision: `dev` (local, previews, Claude's MCP) and `prod`. Schema changes are only `supabase/migrations/*.sql`.
  Prod migrations run through a GitHub workflow that needs manual approval.
- Consequences: No dashboard schema edits on either project.

## D-015: Resend for all email
- Date: 2026-10-04 · Phase: 0 · Status: accepted
- Context: Supabase's built-in SMTP is heavily rate-limited and not for production.
- Decision: Resend as Supabase Auth custom SMTP and for app email (HTTP API, Workers-compatible). Templates
  use React Email in the recipient's locale. Brevo is the fallback.
- Consequences: Needs a domain with SPF/DKIM. Daily cap handled by digests.

## D-016: E-signature behind a provider interface, `manual` by default
- Date: 2026-10-04 · Phase: 0 · Status: accepted
- Context: Neither Documenso's nor DocuSeal's free cloud plan includes API access (checked 2026-10). The
  authority may also require qualified or wet signatures.
- Decision: `SignatureProvider` interface with `manual` (email + upload signed scan), `documenso` and `docuseal`
  adapters. Adapters are enabled only if ACF self-hosts or pays.
- Consequences: The correspondence tracker works in phase 6 without any provider.

## D-017: Cron through GitHub Actions calling authenticated route handlers
- Date: 2026-10-04 · Phase: 0 · Status: accepted
- Context: Free, already in our toolchain, and requested.
- Decision: Workflows POST to `/api/cron/{job}` with `Bearer $CRON_SECRET`. Jobs are idempotent and
  window-based. The 15-minute job also prevents Supabase free-tier pausing.
- Consequences: GitHub may delay schedules, and schedules stop after 60 days of repo inactivity. Cron health is shown in the admin dashboard.

## D-018: Discord: webhooks out, scheduled REST polling in
- Date: 2026-10-04 · Phase: 0 · Status: accepted
- Context: A gateway bot needs an always-on process, which free serverless hosting can't run.
- Decision: Outbound via channel webhook (`allowed_mentions` empty, message id stored). Inbound via a bot
  token polling the announcements channel every 15 minutes, upserting by message id. Text-only mirror in v1.
- Consequences: Up to about 15 minutes of latency. Needs the Message Content intent.

## D-019: Nightly encrypted database backups
- Date: 2026-10-04 · Phase: 0 · Status: accepted
- Context: The Supabase free tier has no backups.
- Decision: A GitHub Actions `supabase db dump`, encrypted with `age` before upload, with 30-day retention. A
  restore drill is part of phases 8 and 9.
- Consequences: Someone at ACF must hold the private key.

## D-020: No payments or ticket sales in v1
- Date: 2026-10-04 · Phase: 0 · Status: accepted
- Context: Payments add compliance work and would rule out Vercel Hobby.
- Decision: Events link to external ticketing.
- Consequences: Revisit after launch if ACF wants memberships or donations online.

## D-021: Cookieless analytics plus SQL metrics
- Date: 2026-10-04 · Phase: 0 · Status: accepted
- Decision: Cloudflare Web Analytics (or Vercel's) for traffic; operational metrics from SQL views on the admin dashboard.
- Consequences: No consent banner needed for analytics.

## D-022: Placeholder design tokens until the ACF charter is provided
- Date: 2026-10-04 · Phase: 0 · Status: accepted
- Context: There is no `/brand` folder. The only assets are the predecessor's (AltScene TN).
- Decision: Phase 1 uses shadcn's neutral palette, clearly marked as a placeholder. AltScene colors are
  kept in `brand.md` as legacy reference only.
- Consequences: Swapping in the charter later is a token-only change.

## D-023: Project-scoped MCP servers, pinned and guarded
- Date: 2026-10-04 · Phase: 0 · Status: accepted
- Context: Future sessions need docs lookup, browser testing, shadcn registry access and database inspection.
- Decision: `.mcp.json` defines `context7`, `playwright`, `shadcn` and `supabase`, with versions pinned in that
  file and pre-approved in `.claude/settings.json`. Wrappers in `scripts/mcp/`:
  `playwright.sh` points at the container's Chromium and adds `--no-sandbox` only when running as root;
  `supabase-dev.sh` refuses to start without `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DEV_PROJECT_REF`
  (never unscoped), refuses if the dev ref equals `SUPABASE_PROD_PROJECT_REF`, and runs `--read-only`
  unless `SUPABASE_MCP_READ_WRITE=1`.
- Consequences: Bump versions deliberately. In this cloud environment, the network policy currently blocks
  context7.com, ui.shadcn.com and supabase.com (see the PR), so those servers connect but can't fetch data until the hosts are allowed.

## D-024: SessionStart hook prepares cloud sessions
- Date: 2026-10-04 · Phase: 0 · Status: accepted
- Decision: `.claude/hooks/session-start.sh` runs only when `CLAUDE_CODE_REMOTE=true`, installs dependencies
  with the lockfile's package manager without rewriting the lockfile (`npm install --no-save`,
  `--frozen-lockfile` for pnpm/bun), and pre-fetches the MCP packages pinned in `.mcp.json`. It runs synchronously.
- Consequences: Session start waits about 10–15 s for the install. It can be switched to async later.

## D-025: Secrets never in git
- Date: 2026-10-04 · Phase: 0 · Status: accepted
- Context: `.env` was not gitignored.
- Decision: `.env` and `.env.*` are ignored (except `.env.example`). Secrets live in the hosting provider, GitHub
  secrets or the Claude environment settings.

## D-026: Every session ends with a PR and a decisions entry
- Date: 2026-10-04 · Phase: 0 · Status: accepted
- Decision: One phase ≈ one session ≈ one PR. Each PR appends its decisions here and updates the docs it
  invalidates. Recorded as a rule in `CLAUDE.md`.

## D-027: Phase 1 versions: Next 16.3.8, React 19.3, TypeScript 6.0.3, Tailwind 4.3, ESLint 9
- Date: 2026-10-04 · Phase: 1 · Status: accepted
- Context: Latest stable versions at the time of the session. ESLint 10 is out (and npm now flags 9 as
  unsupported), but `eslint-plugin-react`, `jsx-a11y` and `import`, which `eslint-config-next` depends on,
  only declare support up to ESLint 9.
- Decision: Next 16.3.8, React 19.3, next-intl 4.14, TypeScript `~6.0.3` (D-002), Tailwind 4.3, ESLint 9.39
  with `eslint-config-next` flat config (`next lint` no longer exists in Next 16), Vitest 5, Playwright 1.63.
- Consequences: Move to ESLint 10 when `eslint-config-next`'s plugins support it.

## D-028: shadcn/ui components hand-ported from the v4 source
- Date: 2026-10-04 · Phase: 1 · Status: accepted
- Context: The shadcn registry (`ui.shadcn.com`) is blocked by this environment's network policy, so
  `npx shadcn add` can't run.
- Decision: Port only what the shell needs (Button, Sheet, DropdownMenu) by hand from shadcn v4 (new-york, `radix-ui`
  package), adapted for RTL (logical sides, `start`/`end` drawers), token-only colours, a localized close label and the
  shared focus outline. `components.json` is configured so the CLI works once the host is allowed.
- Consequences: When adding components with the CLI later, re-apply the same adaptations (they're commented in each file).

## D-029: Design tokens in three layers; Tailwind's default palette removed
- Date: 2026-10-04 · Phase: 1 · Status: accepted
- Decision: `src/app/globals.css` defines brand primitives (`--acf-*`, placeholder neutral scale) → semantic
  shadcn tokens for light and dark → `@theme inline`. `@theme { --color-*: initial; }` removes Tailwind's palette,
  so classes like `bg-blue-500` generate nothing and only token classes work. A Vitest suite parses the CSS and
  checks 18 token pairs per theme against WCAG AA (4.5:1 text, 3:1 UI and focus). Placeholder values were adjusted
  where shadcn's defaults fail AA (muted text, focus ring, input border).
- Consequences: The charter only changes layer 1. Any new token pair used for text must be added to the contrast test.

## D-030: Placeholder fonts: IBM Plex Sans + IBM Plex Sans Arabic
- Date: 2026-10-04 · Phase: 1 · Status: proposed (replace with the charter's fonts)
- Context: The charter is missing; Arabic needs a real web font (system fallbacks render poorly and inconsistently).
- Decision: The first proposal from `brand.md`, loaded with `next/font/google` (downloaded at build, self-hosted,
  no runtime Google requests): Plex Sans (variable, Latin) and Plex Sans Arabic 400/600, exposed as `--font-latin`
  and `--font-arabic`; `:lang(ar)` switches the body font and line height.
- Consequences: About 140 KB of fonts per first visit; revisit when the charter names its typefaces.

## D-031: Edge `middleware.ts` instead of Next 16's `proxy.ts`; static-assets cache on Workers
- Date: 2026-10-04 · Phase: 1 · Status: accepted
- Context: Next 16 renames middleware to `proxy.ts`, which always runs on Node.js. OpenNext bundles Node middleware for
  Workers only experimentally ("not officially maintained"), and measured on this app it produces a 2.70 MiB gzipped
  Worker (it drags in Next's `@vercel/og` wasm) against 1.54 MiB with the Edge `middleware.ts`. The free plan allows 3 MiB.
  It also failed to build at all whenever `@opentelemetry/api` was installed (D-033).
- Decision: Keep the deprecated-but-supported Edge `src/middleware.ts` for next-intl (and Supabase session refresh in
  phase 2). Phase 1 uses OpenNext's static-assets incremental cache (every page is prerendered; no R2 bucket needed) with
  cache interception enabled. Phase 3 switches to the R2 cache when pages revalidate.
- Consequences: `next build` prints a deprecation warning. Revisit when OpenNext supports Node middleware or Next removes
  `middleware.ts` (a future major); the CI bundle-size job will show the cost of switching.

## D-032: Hosting: Cloudflare Workers confirmed as the primary target (provisional until the first deploy)
- Date: 2026-10-04 · Phase: 1 · Status: accepted (CPU confirmation pending), supersedes the "proposed" status of D-013
- Context: The phase 1 spike couldn't deploy: there is no Cloudflare account or token in this environment and
  `api.cloudflare.com` is blocked. Measured locally instead:
  - Worker bundle (`wrangler deploy --dry-run`): **7.93 MiB raw, 1.54 MiB gzip = 51% of the 3 MiB free limit**.
  - The OpenNext build runs on `workerd` (`wrangler dev`) with identical behaviour to `next start`: locale redirects,
    `lang`/`dir`, 404 + `X-Robots-Tag` on hidden areas, sitemap, robots.
  - Local wall-clock latency ≈ 90–100 ms per page (not CPU time; workerd doesn't enforce or report the 10 ms CPU
    limit locally). Prerendered pages are served from the cache with interception, so CPU per request should be small.
  - Lighthouse (mobile, `next start`, three runs): performance `/ar` 92–95, `/fr` 96–97, `/en` 93–94; accessibility,
    best practices and SEO 100 everywhere.
- Decision: Stay on Workers Free. CI fails a PR if the gzipped Worker exceeds 3 MiB (`npm run cf:size`).
  `.github/workflows/deploy.yml` deploys `main` and uploads PR previews once `CLOUDFLARE_DEPLOY_ENABLED=true` and the
  `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` secrets exist. Fall back to Vercel Hobby only if real CPU time exceeds
  the free limit.
- Consequences: The first real deploy must record CPU time p50/p99 (Cloudflare dashboard → Workers → Metrics) here.

## D-033: Lighthouse runs through npx, never as a dependency
- Date: 2026-10-04 · Phase: 1 · Status: accepted
- Context: Installing `lighthouse` pulls `@opentelemetry/api` into `node_modules`. Next's tracer then `require`s it, and
  OpenNext's trace copies only part of that package, so the Workers build fails to bundle.
- Decision: `npm run lighthouse` calls `npx lighthouse@13.5.0` and parses the JSON reports. The lockfile was regenerated so
  the optional peer is no longer installed.
- Consequences: Anything that adds `@opentelemetry/api` (e.g. some monitoring SDKs) will break `cf:build`; CI catches it.

## D-034: Light, dark and system themes
- Date: 2026-10-04 · Phase: 1 · Status: proposed (needs ACF confirmation, open question 3)
- Decision: `next-themes` with the `.dark` class, default `system`, a three-option menu in every header. Both themes are
  contrast-tested and screenshotted.
- Consequences: The charter must provide (or approve derived) dark-theme colours.

## D-035: Phase 1 guards deny everything; dev-only preview of hidden shells
- Date: 2026-10-04 · Phase: 1 · Status: accepted (replaced in phase 2)
- Decision: `requireUser()` / `requireRole()` in `src/lib/auth/guards.ts` call `notFound()` because no user can be signed
  in yet. `ACF_PREVIEW_HIDDEN_AREAS=1` lets them pass **only** when `NODE_ENV === 'development'` (inlined at build, so
  production bundles always deny); `npm run screenshots` uses it. Hidden-area sections are one `[section]` placeholder
  per area with `dynamicParams = false`; real routes replace them in phases 5–7. Hidden areas also get
  `X-Robots-Tag: noindex, nofollow` from `next.config.ts`.
- Consequences: Phase 2 keeps the function signatures and replaces their bodies with Supabase checks.

## D-036: Known limitation: Next 16.3 serves `notFound()` pages as a client-rendered recovery shell
- Date: 2026-10-04 · Phase: 1 · Status: accepted (framework behaviour)
- Context: Responses for `notFound()` (unknown paths, hidden areas) come back as Next's `__next_error__` shell: status
  404, `noindex` and the correct `<head>` are set, but the localized not-found UI renders on the client from the RSC
  payload. Reproduced in a vanilla Next 16.3.8 app, so it is not caused by this codebase.
- Decision: Accept it. With JavaScript, visitors get the localized 404 page (e2e-tested in all locales); crawlers get a 404.
- Consequences: Re-check on each Next upgrade; without JavaScript the 404 page is blank.

## D-037: Conventions enforced by tooling, not just documentation
- Date: 2026-10-04 · Phase: 1 · Status: accepted
- Decision: ESLint fails on physical-direction Tailwind classes (`ml-`, `pr-`, `left-`, `text-right`, …) and on JSX text
  literals in `src/`; `next-intl`'s `AppConfig` is augmented so every message key is type-checked; `npm run i18n:check`
  compares keys and ICU placeholders across locales; a unit test checks that every menu entry and hidden-area section has
  copy and an icon in all three locales, and that `.env.example` lists every variable in `architecture.md`.
- Consequences: Allowed literals (`·`, `/`, `©`, `404`…) are listed in `eslint.config.mjs`.

## D-038: Keep the agent rules block that `next dev` writes into CLAUDE.md
- Date: 2026-10-04 · Phase: 1 · Status: accepted
- Context: Next 16.3 appends (and re-adds) a block telling agents to read `node_modules/next/dist/docs/`. Following it
  caught real API changes this session (`error.tsx` receives `retry`, `next lint` removed, `proxy.ts`).
- Decision: Commit the block as written; don't set `agentRules: false`.

## D-039: Security headers now, CSP in phase 9
- Date: 2026-10-04 · Phase: 1 · Status: accepted
- Decision: `next.config.ts` sends `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options: DENY` and a restrictive
  `Permissions-Policy` on every route, and drops `X-Powered-By`. A nonce-based CSP needs dynamic rendering, which conflicts
  with the static pages, so it is designed in the phase 9 security review.

## D-040: Screenshots committed as contact sheets
- Date: 2026-10-04 · Phase: 1 · Status: accepted
- Decision: `npm run screenshots` captures every area × locale × theme × viewport (54 PNGs in `test-results/`, not
  committed) and composes one JPEG contact sheet per area into `docs/screenshots/phase-1/` (about 700 KB total).
- Consequences: Each later phase adds its own folder rather than overwriting history.
