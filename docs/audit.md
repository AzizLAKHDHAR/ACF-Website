# Repository audit (pre-rebuild)

> Snapshot of the repository as of 2026-10-04, branch `main` @ `eae2f11` ("Prod live !", 2025-10-01).
> Written during the planning session (phase 0). Nothing in `src/` was changed by this audit.

## TL;DR

- The repo is the **"Tunisia Music Scene" / "AltScene TN"** community project, not yet ACF. It is a
  client-side **Vite + React 18 SPA** scaffolded from the `vite_react_shadcn_ts` template and deployed
  to GitHub Pages under `/Tunisia-Music-Scene/`.
- It has **no backend, no auth, no i18n/RTL, no tests, no CI**. Almost all content is **hard-coded mock
  data** (fictional people, venues with made-up phone numbers, 64 Unsplash stock images). The only
  real data set is `public/artists.csv`: 105 artist **names and genres**.
- The production build still works. Lint crashes, the typecheck fails, and there are 18 known
  vulnerabilities in production dependencies.
- **There is no `/brand` folder** on this branch or on `main`. The only identity assets are the
  predecessor's **AltScene TN** wordmark and poster, a memorial image, and a favicon. ACF's
  graphic charter is missing; see [`brand.md`](brand.md).
- **Recommendation:** rebuild from scratch on the target stack (Next.js App Router + Supabase). Keep
  the information architecture, the genre taxonomy and the artist list (as candidate seed data
  pending consent). Throw away the code.

## Current stack and versions

Resolved from `package-lock.json` / `node_modules` (declared range in brackets). "Latest" is from the
npm registry on 2026-10-04.

| Area | Package | Installed | Latest | Notes |
|---|---|---|---|---|
| Build tool | `vite` (^5.4.1) | 5.4.20 | — | Replaced by Next.js |
| Framework | `react` / `react-dom` (^18.3.1) | 18.3.1 | 19.3.0 | Next 16 ships with React 19 |
| Routing | `react-router-dom` (^6.26.2) | 6.27.0 | 7.18.4 | Has known high-severity advisories. Replaced by App Router |
| Language | `typescript` (^5.5.3) | 5.6.3 | 7.0.2 | `strict: false`, `strictNullChecks: false`, `noImplicitAny: false` |
| Styling | `tailwindcss` (^3.4.11) | 3.4.17 | 4.3.3 | JS config; v4 uses CSS-first `@theme` |
| UI kit | shadcn/ui (`components.json`: style `default`, base `slate`, `rsc: false`) | — | CLI 4.21.1 | 49 components vendored; 14 actually imported |
| Data fetching | `@tanstack/react-query` | 5.59.16 | 5.104.1 | Provider mounted, never used for queries |
| CSV | `papaparse` | 5.5.3 | 5.7.0 | Parses `public/artists.csv` in the browser |
| Forms | `react-hook-form` + `zod` 3 | 7.53.1 / 3.23.8 | 7.89.0 / 4.6.5 | Not used by any page |
| Charts | `recharts` | 2.13.0 | 3.10.1 | Only through the unused `ui/chart.tsx` |
| Icons | `lucide-react` | 0.462.0 | 1.52.0 | |
| Lint | `eslint` 9 + `typescript-eslint` | 9.36.0 / 8.11.0 | 10.12.0 / 8.71.0 | Crashes, see below |
| Deploy | `gh-pages` | 6.3.0 | — | `npm run deploy` → GitHub Pages |
| Lockfiles | `package-lock.json` **and** `bun.lockb` | | | Two lockfiles that can drift |

Runtime used for this audit: Node 22.22.0, npm 10.9.4.

## Health check (run during this session)

| Check | Command | Result |
|---|---|---|
| Install | `npm ci` | ✅ 419 packages |
| Build | `npm run build` | ✅ 441 kB JS (131 kB gzip). Warning: browserslist data 24 months old |
| Lint | `npm run lint` | ❌ ESLint crashes: `Error while loading rule '@typescript-eslint/no-unused-expressions'` (typescript-eslint 8.11 vs ESLint 9.36 mismatch) |
| Typecheck | `tsc -p tsconfig.app.json --noEmit` | ❌ 2 errors: `src/pages/Blog.tsx` imports default exports from **empty** `src/components/Navbar.tsx` / `Footer.tsx` (dead code) |
| Tests | — | ❌ None: no test runner, no test files, no `test` script |
| CI | — | ❌ No `.github/` directory |
| Security | `npm audit --omit=dev` | ❌ 18 vulnerabilities (16 high, 1 moderate, 1 low): `react-router`/`@remix-run/router`, the `tailwindcss` 3 toolchain (`braces`, `micromatch`, `chokidar`, `glob`, `minimatch`, `picomatch`, `fast-glob`), `lodash`, `nanoid`, `postcss`, `yaml` |
| Secrets | `git grep` + history scan | ✅ No credentials in tracked files or history. ⚠️ `.env` was **not** gitignored (fixed in this PR) |

## Structure

```
.
├── index.html                 SPA entry + GitHub Pages redirect hack, OG tags (lang="en")
├── public/
│   ├── 404.html               GitHub Pages SPA redirect (rafgraph/spa-github-pages)
│   ├── artists.csv            105 artists: Name, Genre (Image/Spotify/YouTube all empty)
│   ├── alt scene 1.png        AltScene TN poster, 1024×1536, 2.1 MB
│   ├── alt scene 2.png        AltScene TN wordmark, 1024×893, 1.2 MB (rendered at 32 px)
│   ├── cleef post.png         Memorial for Cleef Mbadinga (I-PKU), 1995–2025; used as home hero and OG image
│   ├── favicon.ico            16/32 px
│   ├── placeholder.svg        Template placeholder
│   └── robots.txt             Allow all
├── src/
│   ├── App.tsx                react-router routes → front-office pages only
│   ├── main.tsx, index.css    Theme tokens (HSL CSS vars) + flip-card CSS
│   ├── App.css                Vite boilerplate, unused
│   ├── front-office/          ← the live site
│   │   ├── components/        Navbar (hover-only dropdowns, fake search/bell/avatar), Footer, Navigation
│   │   └── pages/             Home, Artists, ArtistProfile, Blog, Explore, Venues,
│   │                          SceneContributors, ProjectContributors, ProjectInfos, About, FAQ, NotFound
│   ├── back-office/           6 files, all EMPTY (0 bytes)
│   ├── pages/                 ← dead duplicates of 4 older pages (not routed)
│   ├── components/
│   │   ├── Navbar.tsx, Footer.tsx   EMPTY (0 bytes), cause the typecheck errors
│   │   ├── Navigation.tsx           identical copy of front-office/components/Navigation.tsx
│   │   └── ui/                      49 shadcn/ui components
│   ├── hooks/                 use-toast, use-mobile (shadcn)
│   ├── lib/utils.ts           cn() helper
│   ├── utils/csvParser.ts     CSV fetch + **fabricated enrichment** (random album counts, rotating fake cities/years, placeholder social URLs)
│   ├── utils/assets.ts        Hard-coded `/Tunisia-Music-Scene/` asset paths
│   └── assets/                hero-image.jpg (unused), tunisia-desert.jpg (Explore hero)
├── PROJECT-STRUCTURE.md       EMPTY
├── README.md, CONTRIBUTING.md Tunisia Music Scene / AltScene copy
└── LICENSE                    MIT
```

## Findings

### Product and content
1. **Wrong identity.** Every page says "AltScene TN" / "Tunisia Music Scene". ACF is mentioned nowhere.
2. **Fabricated data shown as fact.** `csvParser.ts` invents locations, "active since" years, album
   counts and bios for real, named artists. Venues, scene professionals and project contributors are
   fictional people with Unsplash portraits. Some venues carry real place names (e.g. Hammamet
   festival grounds) next to made-up phone numbers and websites. **None of this may be migrated.**
3. **Only real data:** 105 artist names with a genre. Genre distribution: Soundtracks/Scores 22,
   Alternative/Indie 22, Rock 10, Jazz 10, Hip Hop/Rap 10, Metal 9, Classical/Instrumental 8, Pop 6,
   Traditional/Folk 3, Electronic 3, Reggae/Dub 2. These are real people, so publishing them as
   ACF catalogue entries needs a consent/claim flow (see open questions in the PR).
4. **Memorial content.** `cleef post.png` (a tribute to Cleef Mbadinga, I-PKU, 1995–2025) is the home
   hero and the social-share image. Whether and how to keep a tribute is ACF's call.
5. **Broken links.** The footer links to `/contact`, `/privacy` and `/terms`, which don't exist. Social links are `#`.
6. **Submission flow.** Artist submissions went through an embedded Google Form (README, git history).
   It is replaced by the profile onboarding and approval flow.

### Technical
7. **Client-side SPA on GitHub Pages.** Crawlers get an empty `<div id="root">`, so SEO is poor. Deep
   links rely on the `404.html` redirect hack.
8. **Base path hard-coded** (`/Tunisia-Music-Scene/`) in `vite.config.ts`, `App.tsx`, `csvParser.ts`,
   `assets.ts`, and in `<img src>` attributes in Navbar, Footer and Home.
9. **Duplicate and dead code:** `src/pages/*` and `src/components/{Navbar,Footer,Navigation}` are
   unused; `src/back-office/*` and `PROJECT-STRUCTURE.md` are empty.
10. **TypeScript safety disabled** (`strict: false`, no null checks, implicit `any` allowed).
11. **No i18n and no RTL.** English only, `lang="en"`, physical CSS properties (`ml-*`, `left-3`, `space-x-*`)
    everywhere.
12. **Accessibility:** navigation dropdowns and artist flip-cards work on hover only (no keyboard or
    touch access), there is no skip link, and theme colors weren't contrast-checked.
13. **Performance:** a 1.2 MB PNG is used as a 32 px logo, a 2.1 MB poster ships in `public/`, and there
    is no image optimization.
14. **Unused dependencies:** React Query, react-hook-form, zod, recharts, next-themes and 35 of the 49
    vendored shadcn components are never used by a page.

## Brand assets found

No `/brand` directory exists (checked this branch, `main`, and the full file list). What exists is the
**predecessor project's** identity, not ACF's:

| File | What it is | Sampled colors |
|---|---|---|
| `public/alt scene 2.png` | "AltScene**TN**" wordmark on a navy square | background `#263140`, "AltScene" `#FEFCF7`, "TN" `#7F96A9` |
| `public/alt scene 1.png` | Poster: "ALT SCENE TN — community project for the alternative music scene" | `#202F3C` type on a `#323233` → grey gradient |
| `public/cleef post.png` | Memorial post (black & white photo, small-caps serif) | `#121417`, greys |
| `public/favicon.ico` | 16/32 px icon | — |
| `src/index.css` | Legacy theme tokens (dark only) | background `hsl(220 12% 8%)` ≈ `#121417`, primary/accent `hsl(203 20% 67%)` ≈ `#9AAFBC`, ring `hsl(217 91% 60%)` ≈ `#3C83F6` |

Typography: the code sets no font family, so the browser default sans-serif is used. The wordmark
appears to be set in a heavy grotesque, but the typeface is unidentified.

These values are recorded in [`brand.md`](brand.md) as **legacy reference only**. ACF's charter must
replace them.

## Keep / rewrite / delete

| Decision | Item | Why / how |
|---|---|---|
| **Keep (as input)** | Public information architecture: artists, venues, scene professionals, blog, events, about, FAQ | Matches the new public interface; re-implemented as Next.js routes |
| **Keep (as input)** | Genre taxonomy (11 genres from `artists.csv`) | Seeds the `genres` lookup table (translated ar/fr/en) |
| **Keep (as input, pending consent)** | 105 artist names + genres | Candidate seed for *unclaimed* artist profiles, only if ACF approves (open question) |
| **Keep (as input)** | FAQ and About copy | Rewrite for ACF's mission; some answers (free listings, how to get featured) still apply |
| **Keep** | MIT `LICENSE` | Pending confirmation that the new codebase stays open source |
| **Keep** | `cn()` helper, shadcn/ui as the component approach | Regenerated with the shadcn CLI for Tailwind v4 / React 19 |
| **Ask** | Memorial image for Cleef Mbadinga | Content decision for ACF |
| **Rewrite** | Everything under `src/` | Next.js App Router, server components, Supabase data, i18n/RTL |
| **Rewrite** | `tailwind.config.ts` + `src/index.css` tokens | Tailwind v4 `@theme` tokens derived from ACF's charter ([`brand.md`](brand.md)) |
| **Rewrite** | `tsconfig*.json`, `eslint.config.js` | `strict: true`, Next.js ESLint config |
| **Rewrite** | `README.md`, `CONTRIBUTING.md` | ACF project, setup with Supabase, contribution rules from `CLAUDE.md` |
| **Delete** | `vite.config.ts`, `index.html`, `public/404.html`, `gh-pages` script/dependency, `App.css` | Vite/GitHub Pages specific |
| **Delete** | `src/pages/`, `src/components/{Navbar,Footer,Navigation}.tsx`, `src/back-office/`, `PROJECT-STRUCTURE.md` | Dead or empty |
| **Delete** | `src/utils/csvParser.ts`, `src/utils/assets.ts`, all hard-coded mock arrays and Unsplash URLs | Fabricated data, base-path hacks |
| **Delete** | `bun.lockb` | One package manager (npm), see decisions log |
| **Delete** | `react-router-dom`, `papaparse`, `@tanstack/react-query`, `next-themes` v0.3, unused shadcn components | Not needed on the new stack (re-add individually if a phase needs them) |
| **Delete (after brand decision)** | `alt scene 1.png`, `alt scene 2.png`, `placeholder.svg`, `src/assets/*` | Predecessor identity / stock art |

Deletions happen in **phase 1** (foundation), not in this planning PR.
