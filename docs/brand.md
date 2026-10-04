# Brand and design tokens

> **Status: ACF's graphic charter is not in the repository.** The task asked to extract it from
> `/brand`, but no `/brand` folder exists (checked this branch, `main` and the full history). Every
> ACF value below is therefore **TODO**. The only identity assets in the repo belong to the
> predecessor project, AltScene TN. They are recorded at the end as legacy reference and must
> **not** be used as ACF's brand.

## How tokens work in this project

1. **The charter is the source of truth.** Put it in `/brand` (structure below).
2. **`src/app/globals.css` implements it** as CSS custom properties, in two layers:
   - *brand primitives*: the raw palette from the charter (`--acf-*`);
   - *semantic tokens*: what components use (`--background`, `--primary`, …), mapped onto the
     primitives for light and dark themes. These are the shadcn/ui variable names, so generated
     components pick them up without edits.
3. **Tailwind v4 exposes the semantic tokens** through `@theme inline`, giving `bg-primary`,
   `text-muted-foreground`, etc. Components never use raw hex values or Tailwind palette colors
   (`bg-blue-500`) for brand surfaces.
4. Changing the brand means changing primitives, never components.

### Token template (phase 1 fills it in)

```css
/* src/app/globals.css (excerpt) */
@import "tailwindcss";

:root {
  /* Brand primitives: TODO from charter (HEX from the charter, converted to OKLCH) */
  --acf-primary: TODO;        /* main brand color */
  --acf-primary-ink: TODO;    /* text on primary, must reach 4.5:1 */
  --acf-secondary: TODO;
  --acf-accent: TODO;         /* highlight / call to action */
  --acf-ink: TODO;            /* darkest neutral, body text */
  --acf-paper: TODO;          /* lightest neutral, page background */
  --acf-neutral-100 … 900: TODO; /* neutral scale, derived if the charter gives only 2 neutrals */

  /* Semantic tokens: shadcn/ui names */
  --background: var(--acf-paper);
  --foreground: var(--acf-ink);
  --primary: var(--acf-primary);
  --primary-foreground: var(--acf-primary-ink);
  --secondary: var(--acf-secondary);
  --secondary-foreground: TODO;
  --accent: var(--acf-accent);
  --accent-foreground: TODO;
  --muted: TODO;  --muted-foreground: TODO;
  --card: TODO;   --card-foreground: TODO;
  --popover: TODO; --popover-foreground: TODO;
  --border: TODO; --input: TODO; --ring: var(--acf-accent);
  --destructive: TODO;            /* functional red, not from the charter unless it defines one */
  --success: TODO; --warning: TODO; --info: TODO;  /* functional status colors */
  --chart-1 … --chart-5: TODO;    /* admin analytics; must be distinguishable for color-blind users */
  --radius: TODO;                 /* corner style from the charter (sharp / soft / round) */

  --font-sans: TODO;     /* Latin UI font  */
  --font-arabic: TODO;   /* Arabic UI font */
  --font-display: TODO;  /* optional headline font */
}

.dark { /* TODO: dark theme mapping, if the charter allows a dark mode */ }

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  /* … one line per semantic token … */
  --font-sans: var(--font-sans);
  --radius-lg: var(--radius);
}

:lang(ar) { font-family: var(--font-arabic), var(--font-sans), system-ui, sans-serif; }
```

**Implemented in phase 1 (placeholder).** `src/app/globals.css` follows this template exactly, with a
neutral grey scale as the brand primitives (marked `PLACEHOLDER — replace with ACF charter`), so layout
work isn't blocked and the predecessor's identity isn't carried over (D-022, D-029). Tailwind's default
palette is removed, so only token classes exist. Placeholder values that differ from shadcn's neutral
defaults, to pass WCAG AA:

| Token | Light | Dark | Why |
|---|---|---|---|
| `--muted-foreground` | neutral-600 `oklch(0.439 0 0)` | neutral-400 `oklch(0.708 0 0)` | shadcn's light value is 4.3:1 on `--muted` |
| `--ring` | neutral-600 | neutral-400 | focus outline needs 3:1 against the page |
| `--input` | neutral-500 | neutral-500 | input borders need 3:1 (1.4.11) |
| `--destructive` | red-700 | red-400 | readable as text on the background |

`npm test` runs the contrast suite (`src/styles/contrast.test.ts`) over 18 pairs per theme; add a pair
there whenever a new foreground/background combination is introduced.

## Colors

| Token | ACF value | Usage | Status |
|---|---|---|---|
| Primary | **TODO** | Header, primary buttons, links | Needs charter |
| Primary ink | **TODO** | Text/icons on primary | Needs charter + contrast check |
| Secondary | **TODO** | Secondary surfaces, tags | Needs charter |
| Accent | **TODO** | Highlights, focus ring, CTAs | Needs charter |
| Ink (dark neutral) | **TODO** | Body text | Needs charter |
| Paper (light neutral) | **TODO** | Page background | Needs charter |
| Neutral scale | **TODO** | Borders, muted text, cards | Derived from ink/paper if not specified |
| Destructive / success / warning / info | **TODO** | Form errors, status badges | Functional; pick accessible defaults if the charter is silent |
| Profile-type colors (artist, professional, venue, studio, blog) | **TODO** | Catalogue badges, map pins | Optional; must not rely on color alone |
| Dark theme | **TODO** (placeholder implemented) | — | Light/dark/system themes ship in phase 1 (D-034); ACF to confirm and provide dark colours |

Accessibility requirement (WCAG 2.2 AA): text contrast ≥ 4.5:1 (≥ 3:1 for large text), UI component
and focus-indicator contrast ≥ 3:1, in every theme. Phase 1 adds an automated contrast check over the
token pairs, and if a charter color fails, a darker or lighter *tint for UI use* is derived and documented here.

## Typography

| Role | ACF font | Status | Notes |
|---|---|---|---|
| Arabic UI/body | **TODO** | Needs charter | Must have good Arabic shaping, several weights, and an open license for web use |
| Latin UI/body (fr/en) | **TODO** | Needs charter | Must include French diacritics |
| Display/headlines | **TODO** | Optional | Only if the charter defines one; also needs an Arabic counterpart |

**Placeholder in use (phase 1, D-030):** IBM Plex Sans (variable, Latin) + IBM Plex Sans Arabic 400/600, via
`next/font/google` (self-hosted at build), exposed as `--font-latin` / `--font-arabic`.

If the charter doesn't specify web fonts, here are proposals to pick from (all open-license, on Google Fonts, loadable
with `next/font` so they're self-hosted):
- **IBM Plex Sans Arabic + IBM Plex Sans**: designed as a pair, neutral and institutional.
- **Readex Pro**: one variable family covering both Arabic and Latin, contemporary.
- **Noto Kufi Arabic + Inter**: geometric Arabic with a very legible Latin UI font.

Rules: Arabic text gets a slightly larger size and line height than Latin at the same step
(type scale TODO), no letter-spacing on Arabic, no synthetic bold or italics in Arabic.

## Logo

| Item | Status |
|---|---|
| Primary logo (SVG) | **TODO**, not in repo. Placeholder: the text "ACF" in a primary-coloured box (`src/components/layout/logo.tsx`) and `src/app/icon.svg` |
| Variants: horizontal / stacked / symbol only | **TODO** |
| Monochrome black and white versions | **TODO** |
| Arabic and Latin lockups (if the name is written differently per language) | **TODO** |
| Clear-space rule (minimum margin around the logo) | **TODO** |
| Minimum size (screen) | **TODO** |
| Allowed backgrounds / forbidden uses (stretch, recolor, effects) | **TODO** |
| Favicon set (SVG + 32 px ICO + 180 px Apple touch + 192/512 px PWA) | **TODO**, generated from the symbol |
| Social share image template (1200×630) per locale | **TODO** |

RTL note: **logos are never mirrored** in the Arabic layout; only their position in the header
moves (start ↔ end). Directional icons (arrows, chevrons, "back") are mirrored.

## Imagery, iconography, tone

| Item | Status |
|---|---|
| Photo style (color/black & white, grain, crops) | **TODO** |
| Illustration or pattern elements (e.g. a Tunisian motif) | **TODO** |
| Icon set | Proposal: `lucide-react` (already used by shadcn/ui), stroke width to match the charter |
| Voice and tone in ar / fr / en (formal "vous" vs informal "tu"; Modern Standard Arabic vs Tunisian dialect in UI copy) | **TODO**, decision needed |

## What to put in `/brand`

```
brand/
├── charter.pdf                 the graphic charter (source of truth)
├── logo/
│   ├── acf-logo-primary.svg
│   ├── acf-logo-stacked.svg
│   ├── acf-symbol.svg
│   ├── acf-logo-mono-black.svg
│   ├── acf-logo-mono-white.svg
│   └── acf-logo-{ar,fr}.svg    only if lockups differ per language
├── colors.md                   name, HEX, RGB (and CMYK/Pantone if print matters)
├── fonts.md                    font names, weights, license / source (or the font files + licenses)
└── templates/                  social post / poster / OG image templates (optional)
```

SVG is strongly preferred for logos (PNG at ≥ 1024 px is the fallback).

## Legacy reference: AltScene TN (do **not** use as ACF brand)

Extracted from the predecessor project's files during the audit:

| Source | Element | Value |
|---|---|---|
| `public/alt scene 2.png` (wordmark) | Background navy | `#263140` |
| | "AltScene" off-white | `#FEFCF7` |
| | "TN" slate blue | `#7F96A9` |
| `public/alt scene 1.png` (poster) | Headline ink | `#202F3C` |
| | Background greys | `#323233` → `#3C3D3E` |
| `src/index.css` (dark-only theme) | `--background` | `hsl(220 12% 8%)` ≈ `#121417` |
| | `--primary` / `--accent` | `hsl(203 20% 67%)` ≈ `#9AAFBC` |
| | `--secondary` / `--muted` / `--border` | `hsl(217.2 32.6% 17.5%)` ≈ `#1E293B` |
| | `--muted-foreground` | `hsl(215 20.2% 65.1%)` ≈ `#94A3B8` |
| | `--ring` | `hsl(217 91% 60%)` ≈ `#3C83F6` |
| | `--radius` | `0.5rem` |
| Typography | — | No font set (browser default sans-serif). Wordmark is a heavy grotesque, unidentified |
