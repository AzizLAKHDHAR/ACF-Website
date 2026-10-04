# ACF website: working agreement

Website and internal platform for **ACF**, a cultural association in Tunisia supporting the music and arts
scene. It has four access levels: public · members · board · admin. Read these before changing anything:

| Doc | What it holds |
|---|---|
| [`docs/vision.md`](docs/vision.md) | What we're building and why |
| [`docs/roles.md`](docs/roles.md) | **Permission matrix**: the source of truth for every RLS policy |
| [`docs/architecture.md`](docs/architecture.md) | Routes, data model, auth, integrations, deployment |
| [`docs/brand.md`](docs/brand.md) | Design tokens (ACF charter still TODO) |
| [`docs/roadmap.md`](docs/roadmap.md) | Phases 1–9 with acceptance criteria |
| [`docs/decisions.md`](docs/decisions.md) | Append-only decisions log |
| [`docs/audit.md`](docs/audit.md) | State of the legacy code before the rebuild |

## Current state

**Phase 0 (planning) is done. Phase 1 is next.** `src/` still contains the legacy *AltScene TN* Vite SPA
(see the audit). **Don't extend or fix it**; phase 1 deletes it. Update this section at the end of every phase.

## Stack

Next.js 16 (App Router, `proxy.ts`) · React 19 · TypeScript 6.0 (`strict`) · Tailwind CSS v4 · shadcn/ui ·
next-intl (`ar` RTL, `fr`, `en`) · Supabase (Postgres + RLS, Auth, Storage) · Zod · React Hook Form ·
Resend + React Email · Vitest · Playwright · pgTAP · deploy with `@opennextjs/cloudflare` (Workers), or Vercel Hobby as fallback.
Package manager: **npm** only. Node 22.

## Commands

Target commands (created in phase 1/2; keep this table true):

| Command | Does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint (zero warnings) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright (all three locales) |
| `npm run i18n:check` | Message files have identical keys |
| `npx supabase start` / `db reset` | Local stack / rebuild schema + seed (needs Docker) |
| `npx supabase migration new <name>` | New migration file (the only way to change the schema) |
| `npx supabase test db` | pgTAP RLS suite |
| `npm run db:types` | Regenerate `src/types/database.ts` |
| `npm run preview:cf` | OpenNext build + local Workers preview |

Legacy commands that work **today**: `npm run dev` (Vite, port 8080) and `npm run build`. `npm run lint` currently crashes and
there are no tests (see the audit).

## Folder conventions

```
src/app/[locale]/(public|auth|account|member|board|admin)/…   routes only, thin
src/app/api/cron/[job] · src/app/api/webhooks/…               service-role code lives ONLY here
src/features/<domain>/{components,queries.ts,actions.ts,schemas.ts}
src/components/ui        shadcn/ui (generated; restyle through tokens, not edits)
src/components/layout    header, footer, nav, locale switcher
src/lib/supabase/        server.ts · browser.ts · public.ts (no cookies) · admin.ts (service role, server-only)
src/lib/auth/guards.ts   requireUser() · requireRole()
src/i18n/ · messages/{ar,fr,en}.json · src/emails/
supabase/migrations · supabase/tests · supabase/seed.sql
tests/e2e · docs/ · scripts/
```

Naming: files and folders `kebab-case`, React components `PascalCase`, TS identifiers `camelCase`, SQL `snake_case`.
Unit tests sit next to the code (`*.test.ts`).

## Coding standards

- **Server Components by default.** Add `'use client'` only for interactivity, as low in the tree as possible.
- **Server Action shape:** `parse input with Zod → requireUser/requireRole → mutate with the user-scoped
  client → revalidate tags → return a typed result` (`{ ok: true, data } | { ok: false, error }`). Never trust
  ids, roles or prices sent by the client.
- TypeScript `strict`. No `any`. No `!` non-null assertions without a comment explaining why. Use the generated
  DB types (`Database`); don't write table types by hand.
- Validate at every boundary (forms, actions, route handlers, webhooks, env vars) with Zod.
- Styling: Tailwind with **token classes only** (`bg-primary`, `text-muted-foreground`). No raw hex, no
  palette colors for brand surfaces, no inline styles. Use `cn()` to merge classes.
- Accessibility (WCAG 2.2 AA): semantic HTML, a label for every input, visible focus, everything reachable by
  keyboard and touch (no hover-only UI), `alt` text, reduced-motion support.
- **No fabricated content.** Demo data lives in `supabase/seed.sql`, is obviously fictional, and never ships to prod.
- New dependencies need a reason in the PR. Prefer platform and Next.js built-ins, and watch the Workers bundle
  limit (3 MB compressed).
- Comments explain *why*, not *what*. Match surrounding style.

## i18n and RTL rules

- Every user-facing string goes through next-intl (`useTranslations` / `getTranslations`). Add each key to
  **all three** `messages/*.json` in the same commit.
- `<html lang dir>` is set from the locale; `ar` is `rtl`.
- Use **logical** Tailwind utilities only: `ms-* me-* ps-* pe-* start-* end-* text-start text-end
  border-s border-e rounded-s-*`. Never `ml-* mr-* pl-* pr-* left-* right-* text-left text-right`.
- Mirror directional icons (chevrons, arrows) with `rtl:rotate-180` or similar. Never mirror logos, media or charts.
- User-generated text gets `dir="auto"`. Don't concatenate translated fragments; use ICU messages with
  placeholders, plurals and selects.
- Format dates, numbers and money with `Intl` (`ar-TN`, `fr-TN`, `en`), timezone `Africa/Tunis`. Money is integer
  millimes, shown with 3 decimals.
- Translatable short DB fields are `jsonb` locale maps with the fallback chain *requested → fr → ar → en*.
  Posts are one row per locale.
- Check every new screen in `ar` **and** one LTR locale before calling it done.

## Security rules (non-negotiable)

1. **RLS on every table.** A migration that creates a table also enables RLS, adds its policies, and adds pgTAP
   tests for allowed *and* denied access per [`docs/roles.md`](docs/roles.md). CI fails on any table without RLS.
2. **Never trust client-side role checks.** Hiding UI is cosmetic. Authorization is RLS plus server-side
   `requireRole()` in every layout **and** every Server Action and route handler (actions are public endpoints).
3. On the server, get identity from `supabase.auth.getClaims()` / `getUser()`, never `getSession()`, cookies you parsed
   yourself, or request bodies.
4. Roles come from `public.memberships` via `private.has_role()`, never from JWT custom claims or user metadata
   (users can edit `user_metadata`).
5. The **service-role key** is used only in `src/lib/supabase/admin.ts`, imported only from `src/app/api/cron/**`,
   `src/app/api/webhooks/**` and account deletion. Never prefix it `NEXT_PUBLIC_`. Any new use must be listed in `roles.md`.
6. Private columns live in private tables (RLS is row-level). Don't rely on `select` lists to hide data.
7. Privileged state changes (approvals, publishing, role grants, correspondence status, ledger periods) go
   through `SECURITY DEFINER` functions with `set search_path = ''` that re-check the caller and write `audit_log`.
8. Private files: private buckets plus short-lived signed URLs issued after an authorization check.
9. Verify webhook signatures and `CRON_SECRET` (constant-time) before doing any work. Make jobs idempotent.
10. Secrets never go in git (`.env*` is ignored; keep `.env.example` current). Never paste secrets into PRs, docs or logs.
11. Sanitize rendered Markdown/HTML. User links get `rel="nofollow ugc noopener"`.
12. When `roles.md` changes, policies and tests change in the same PR.

## Database rules

- Schema changes **only** via `supabase/migrations/*.sql` (`npx supabase migration new`). No dashboard edits on any project.
- Never edit a migration that is already merged; add a new one.
- After a migration, regenerate types (`npm run db:types`) and commit them.
- The Supabase MCP server is **dev-project only** and read-only by default. Never point it at prod.

## Testing

- Unit (Vitest): pure logic such as formatting, permissions helpers, status machines and export totals.
- RLS (pgTAP): the `roles.md` matrix, both allowed and denied cases, plus the guard rails.
- E2E (Playwright): critical journeys in `ar` and `fr` at minimum; axe accessibility checks on every new page template.
- A bug fix comes with a test that fails without the fix.

## Session workflow (every session)

1. Work on the branch you were given (or `claude/<topic>`). Never push to `main`; never force-push shared branches.
2. Scope the session to **one roadmap phase** (or part of one). Don't start the next phase in the same PR.
3. Before pushing, run lint, typecheck, unit tests and the build (plus e2e/RLS when they're relevant), then reread the diff.
4. Commit messages: imperative, with a conventional prefix (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`).
5. **Every session ends with a pull request.** Its description covers what changed, how it was verified,
   assumptions, and open questions for ACF.
6. **Every session appends its decisions to [`docs/decisions.md`](docs/decisions.md)** (next `D-NNN`, date,
   context, decision, consequences) in that PR, and updates any doc it made stale (roadmap checkboxes,
   architecture, roles, the commands table above, "Current state").

## MCP servers (project-scoped, `.mcp.json`)

| Server | Use it for | Needs |
|---|---|---|
| `context7` | Current docs for Next.js, Supabase, next-intl, Tailwind, shadcn | Network access to `context7.com` (optional `CONTEXT7_API_KEY`) |
| `playwright` | Driving the app in a real browser, screenshots in `ar`/`fr`/`en` | Chromium (auto-detected in cloud sessions) |
| `shadcn` | Browsing and adding registry components | Network access to `ui.shadcn.com` |
| `supabase` | Inspecting the **dev** database (read-only) | `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DEV_PROJECT_REF` env vars |

Versions are pinned in `.mcp.json`. The wrappers live in `scripts/mcp/`. Cloud sessions run
`.claude/hooks/session-start.sh` at start (installs deps and pre-fetches the MCP packages).

## Cloud environment notes

- The environment's network policy may block hosts (currently `context7.com`, `ui.shadcn.com`,
  `supabase.com`, `api.supabase.com`, `nextjs.org`, `opennext.js.org`). If you hit a 403 from the proxy,
  report the host. Don't work around it.
- Chromium is pre-installed at `/opt/pw-browsers`. Don't run `playwright install`. Use
  `executablePath: '/opt/pw-browsers/chromium'` if a pinned Playwright version wants another build.
- The container is ephemeral: anything not committed and pushed is lost.
