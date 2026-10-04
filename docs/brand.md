# Brand and design tokens

> **Status: the charter is in [`/brand`](../brand) and implemented (D-041, D-044–D-046).**
> ACF is the **Amplify Creative Foundation**. `/brand` holds the one-page graphic charter
> (`charte.png`) and the association's one-pager in English (pages 1–2), French (3–4) and Arabic (5–6).
> The charter gives three colours, two typefaces and the logo; everything else below (tints, dark theme,
> web-font stand-ins) is derived here and listed as such. Still missing: a vector logo, web licences for
> the charter fonts, and contact channels (see the TODO list at the end).

## The charter at a glance

| Element | Charter | On the web |
|---|---|---|
| Colours | Green `#72c71e`, ink `#181414`, white `#ffffff` | Exact values as primitives; tints derived for UI (below) |
| Display type | **Rokiest**, tracking +40 | Stand-in: **Outfit** 800 (Google Fonts, OFL) — Rokiest is commercial (D-045) |
| Body type | **GC Arturm Light** | Stand-in: **Outfit** (variable) for Latin, **Alexandria** (variable) for Arabic (D-045) |
| Logo | "Amplify" wordmark in an outlined plate, "CREATIVE FOUNDATION" beneath, ® | Raster alpha masks traced from the one-pager, recoloured by CSS (D-046) |
| Logo on colour | Ink wordmark on a green tile; white wordmark on an ink tile | Wordmark follows `currentColor`, so it works on every surface and theme |
| Motif | Pixel camouflage in pale green; big rounded corners; outlined circles and boxes | Inline-SVG camo tile (`src/components/brand/camo-tile.ts`) tinted with `--camo`; `--radius: 1rem`; 2 px ink outlines |

## How tokens work in this project

1. **The charter is the source of truth.** It lives in `/brand`.
2. **`src/app/globals.css` implements it** as CSS custom properties, in two layers:
   - *brand primitives*: the charter palette plus derived tints (`--acf-*`);
   - *semantic tokens*: what components use (`--background`, `--primary`, …), mapped onto the
     primitives for light and dark themes. These are the shadcn/ui variable names, so generated
     components pick them up without edits.
3. **Tailwind v4 exposes the semantic tokens** through `@theme inline`, giving `bg-primary`,
   `text-muted-foreground`, etc. Tailwind's default palette is removed (`--color-*: initial`), so classes
   like `bg-blue-500` generate nothing and components can only use token classes.
4. Changing the brand means changing primitives, never components.

`npm test` runs the contrast suite (`src/styles/contrast.test.ts`) over every token pair in both themes
(WCAG AA: 4.5:1 for text, 3:1 for UI components and focus). Add a pair there whenever a new
foreground/background combination is introduced.

## Colours

### The green problem

Charter green `#72c71e` against white is about **2.1:1**: it fails as text, as a link colour and even as a
UI boundary (3:1). Against ink it is about **8.6:1**. So, in the light theme:

- green is a **surface** colour (buttons, tiles, value bullets, the "financial" circle), always with **ink**
  text on it and a **2 px ink outline** where its edge must be visible (buttons, bullets), exactly like
  the outlined shapes in the charter;
- text and links on light backgrounds are **ink**; links are underlined;
- the focus ring is ink in light mode and green in dark mode.

In the dark theme green works directly against ink, so it also serves as the outline and focus colour.

### Primitives (`--acf-*`)

| Primitive | Value | Origin | Used for |
|---|---|---|---|
| `--acf-green` | `#72c71e` | Charter | Primary buttons, brand surfaces, charts |
| `--acf-ink` | `#181414` | Charter | Text (light), page background (dark), secondary surfaces |
| `--acf-white` | `#ffffff` | Charter | Page background (light), text (dark) |
| `--acf-green-50` | `#f3faeb` | Derived | `muted` sections (light) |
| `--acf-green-100` | `#e3f4d1` | Derived | `accent` hover, camo motif (light) |
| `--acf-green-200` | `#c8e9a4` | Derived | Reserved for borders on green surfaces |
| `--acf-green-800` | `#2a4512` | Derived | `accent` hover (dark) |
| `--acf-green-900` | `#1f2c14` | Derived | Camo motif (dark) |
| `--acf-ink-900` … `--acf-ink-100` | `#221d1d` … `#f3f0f0` | Derived | Warm greys from the ink: cards, borders, muted text, inputs |
| Red / amber / blue / green-ok | OKLCH | Functional, not in the charter | Errors, warnings, info, success |

### Semantic mapping

| Token | Light | Dark |
|---|---|---|
| `background` / `foreground` | white / ink | ink / white |
| `card`, `popover` | white | ink-900 |
| `primary` / `primary-foreground` | green / ink | green / ink |
| `primary-border` (outline of green elements) | ink | green |
| `secondary` / `secondary-foreground` | ink / white | white / ink |
| `muted` / `muted-foreground` | green-50 / ink-600 | ink-800 / ink-400 |
| `accent` / `accent-foreground` | green-100 / ink | green-800 / white |
| `brand` / `brand-foreground` (decorative green surfaces) | green / ink | green / ink |
| `camo` (motif tint) | green-100 | green-900 |
| `border` / `input` / `ring` | ink-200 / ink-500 / ink | ink-700 / ink-500 / green |
| `destructive`, `success`, `warning`, `info` | 700 shades, white text | 400 shades, ink text |
| `chart-1` / `chart-2` | green / ink | green / white |
| `radius` | `1rem` | `1rem` |

**Dark mode** (D-034, confirmed by ACF): light, dark and system themes, defaulting to the visitor's system
setting. The dark theme inverts the charter's own "white wordmark on an ink tile" variant: ink page,
white text, green for actions and outlines.

## Typography

| Role | Charter font | Web font in use | Notes |
|---|---|---|---|
| Display / headlines | Rokiest (commercial) | Outfit 800, `--font-display` | Rokiest is a heavy geometric grotesque; Outfit is the closest open-licence match. The charter's +40 tracking belongs to Rokiest and is not applied to the stand-in |
| Latin body (fr/en) | GC Arturm Light (commercial) | Outfit (variable), `--font-latin` | Geometric, light weights available, French diacritics |
| Arabic body and headlines | — (the charter has no Arabic face) | Alexandria (variable), `--font-arabic` | Geometric Kufi-style Arabic that sits well next to Outfit; `:lang(ar)` switches the body font |

All fonts load through `next/font/google`: downloaded at build time and self-hosted, so visitors make no
requests to Google. If ACF buys web licences for Rokiest and GC Arturm, add the files under
`src/fonts/` and switch to `next/font/local`; only `src/app/[locale]/layout.tsx` changes.

Rules: no letter-spacing on Arabic, no synthetic bold or italics in Arabic, Arabic text gets a slightly
larger line height than Latin.

## Logo

| Item | Status |
|---|---|
| Wordmark ("Amplify" plate) | **Raster mask** `public/brand/amplify-wordmark.png` (460×159), traced from the one-pager; header and footer (`Wordmark` in `src/components/layout/logo.tsx`) |
| Full lockup (wordmark + CREATIVE FOUNDATION) | **Raster mask** `public/brand/amplify-lockup.png` (1652×665); About hero (`Lockup`) |
| Favicon / Apple touch icon | `src/app/icon.png` (512) and `src/app/apple-icon.png` (180): green rounded square with an ink "A" — a stand-in until a symbol is designed |
| Vector logo (SVG) | **TODO** — needed for crisp rendering at every size and for print; replaces the masks with no component changes |
| Symbol-only mark | **TODO** — the favicon would use it |
| Clear space, minimum size, forbidden uses | **TODO** — not in the charter. Working rule until ACF defines one (proposed): keep the width of the "A" clear around the wordmark and never show it below 24 px high (the header uses 32 px) |
| Arabic lockup | Not needed: the brand name stays "Amplify" in Latin script on the Arabic site (the one-pager does the same) |
| Social share image (1200×630) per locale | **TODO** (phase 9) |

The masks are single-colour alpha masks, so the logo takes the text colour of wherever it sits (ink on
white and green, white on ink) — the same two variants the charter shows. **Logos are never mirrored** in
the Arabic layout; only their position in the header moves (start ↔ end).

## Imagery, iconography, tone

| Item | Status |
|---|---|
| Motif | Pixel camouflage, pale green on white (charter); dark green on ink in dark mode. Decorative, `aria-hidden` |
| Shapes | Big rounded corners (`rounded-2xl` cards, pill buttons), 2 px outlines, filled/outlined circles for the three axes, square bullets for values |
| Photo style | **TODO** — the charter shows a grain texture; photos arrive with the catalogue (phase 3) |
| Icon set | `lucide-react`, stroke width default |
| Voice and tone | Follow the one-pager: short, direct sentences, first person plural ("we", "nous", "نحن"); Arabic in Modern Standard Arabic. Interface copy addresses visitors politely (*vous*, plural Arabic forms) |
| Official copy | The About page and home use the one-pager text verbatim in each language (D-041) |

## What is in `/brand`

```
brand/
├── charte.png                      the graphic charter: logo, fonts, colours, logo on colour
├── ACF one-pager_page-0001.jpg     English, page 1 (who we are, values, members)
├── ACF one-pager_page-0002.jpg     English, page 2 (three axes, join us)
├── ACF one-pager_page-0003.jpg     French, page 1
├── ACF one-pager_page-0004.jpg     French, page 2
├── ACF one-pager_page-0005.jpg     Arabic, page 1
└── ACF one-pager_page-0006.jpg     Arabic, page 2
```

Still wanted: `logo/*.svg` (primary, stacked, symbol, mono black, mono white), font licence details, and
the association's email, website and Instagram (the one-pager prints `[EMAIL]`, `[WEBSITE]`, `[INSTAGRAM]`
placeholders).

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
