# Amplify Creative Foundation — website and association platform

Public website and internal platform of the **Amplify Creative Foundation (ACF)**, a Tunisian association
and *a home for Tunisia's alternative music scene*: rock, jazz, metal, funk and every sound outside the
mainstream. Trilingual — **French (default), Arabic (RTL) and English** — with four access levels:

| Level | What it is |
|---|---|
| **Public** | News from the scene, blogs, catalogues of artists, professionals, venues and studios, events |
| **Members** (hidden) | Meetings and RSVP, tasks, announcements (incl. Discord), polls, volunteering, documents |
| **Board** (hidden) | Task assignment, finances, legal vault, correspondence with the supervising authority |
| **Admin** (hidden) | Users and roles, profile approvals, moderation, audit log, analytics, settings |

> **Status: phase 1 of 9 — foundation, in ACF's brand.** The trilingual layout shell uses the
> charter in `/brand` (green, ink and white, pixel camo, the Amplify wordmark) in light and dark
> themes. Home and About carry the official one-pager copy; other routes are placeholders until data and
> auth arrive in the next phases ([roadmap](docs/roadmap.md), [brand](docs/brand.md)).

![Home page in French, Arabic and English, light and dark, desktop and mobile](docs/screenshots/brand/public.jpg)

More screenshots: [about](docs/screenshots/brand/about.jpg) · [member](docs/screenshots/brand/member.jpg) ·
[board](docs/screenshots/brand/board.jpg) · [admin](docs/screenshots/brand/admin.jpg) ·
[mobile drawers](docs/screenshots/brand/drawers.jpg) · phase 1 before the brand:
[`docs/screenshots/phase-1/`](docs/screenshots/phase-1/).

## Stack

[Next.js 16](https://nextjs.org) (App Router) · React 19 · TypeScript 6 (strict) · Tailwind CSS 4 ·
[shadcn/ui](https://ui.shadcn.com) on Radix · [next-intl](https://next-intl.dev) · Supabase (Postgres
+ RLS, Auth, Storage — from phase 2) · Vitest · Playwright + axe · hosted on **[Vercel](https://vercel.com)**.

## Getting started

Requirements: **Node.js 22** and npm.

```bash
npm install
cp .env.example .env.local   # optional in phase 1 — every variable has a safe default or is unused yet
npm run dev                  # http://localhost:3000 → redirects to /fr (or /ar, /en from your browser language)
```

The hidden areas (`/member`, `/board`, `/admin`, `/account`) answer **404** until authentication
lands in phase 2. To review their layout locally:

```bash
ACF_PREVIEW_HIDDEN_AREAS=1 npm run dev   # development only — production builds always deny
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server (Turbopack) |
| `npm run build` / `npm start` | Production build / serve it |
| `npm run lint` | ESLint, zero warnings allowed (also bans physical-direction classes and JSX text literals) |
| `npm run typecheck` | Generates route types, then `tsc --noEmit` |
| `npm run format` / `format:check` | Prettier (with Tailwind class sorting) |
| `npm test` | Vitest: unit tests, design-token contrast (WCAG AA), config ↔ message consistency |
| `npm run test:e2e` | Playwright on the production build: desktop + mobile, ar/fr/en, axe accessibility |
| `npm run i18n:check` | `messages/ar.json`, `fr.json`, `en.json` have identical keys and placeholders |
| `npm run screenshots` | Screenshots in every locale × theme × viewport → `docs/screenshots/brand/` (override with `SCREENSHOT_DIR`) |
| `npm run lighthouse` | Mobile Lighthouse on `/ar`, `/fr`, `/en` (needs `npm start` running); fails below 90 |

Playwright uses its own Chromium (`npx playwright install chromium`), or the browser in
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` if set.

## Project layout

```
messages/                 UI strings: ar.json · fr.json · en.json
src/
├── app/[locale]/         routes — (public) (auth) (account) (member) (board) (admin)
├── components/ui/        shadcn/ui primitives (restyled through tokens only)
├── components/brand/     charter motifs and one-pager sections (camo, genres, values, axes)
├── components/layout/    header, footer, navigation, locale switcher, theme toggle, logo, shells
├── config/               navigation and icons (single source for menus)
├── i18n/                 next-intl routing, request config, locale helpers
├── lib/                  guards, metadata, env, route factories, utilities
├── proxy.ts              locale negotiation (French by default — docs/decisions.md D-043)
└── styles/               token parsing used by the contrast test
tests/e2e/                Playwright specs · tests/screenshots/ screenshot matrix
brand/                    ACF's graphic charter and one-pager (source of truth for the design)
public/brand/             logo masks cut from the charter
docs/                     vision, roles, architecture, brand, roadmap, decisions, audit
```

## Conventions

Read [`CLAUDE.md`](CLAUDE.md) before contributing — it is the working agreement for humans and
Claude: coding standards, **i18n/RTL rules** (logical CSS only, every string in three languages),
**security rules** (RLS on every table, never trust client-side role checks) and the session
workflow (every change ends in a pull request and a [decisions](docs/decisions.md) entry).

| Doc | |
|---|---|
| [Vision](docs/vision.md) | What we are building and why |
| [Roles](docs/roles.md) | Permission matrix — source of truth for authorization |
| [Architecture](docs/architecture.md) | Routes, data model, auth, integrations, deployment |
| [Brand](docs/brand.md) | The charter, design tokens, fonts and logo |
| [Roadmap](docs/roadmap.md) | Phases 1–9 with acceptance criteria |
| [Decisions](docs/decisions.md) | Append-only decisions log |

## Deployment

Hosted on **Vercel** with its Git integration: import the repository in Vercel (framework preset
Next.js, Node 22), and `main` deploys to production while every pull request gets a preview URL.
Set `NEXT_PUBLIC_SITE_URL` in the Vercel project's environment variables (see
[`.env.example`](.env.example)); never commit secrets. The database is Supabase from phase 2: preview
deployments use the **dev** project, production the **prod** project. Details in
[architecture §10](docs/architecture.md#10-environments-and-free-tier-deployment-plan).

## License

[MIT](LICENSE).
