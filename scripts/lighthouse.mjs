#!/usr/bin/env node
// Mobile Lighthouse audit (all categories ≥ 90): the home page in every locale (phase 1), plus a
// catalogue and detail pages from the local seed (phase 3). Override with PAGES=/fr,/ar/events.
// Usage: npm run build && npm start   (in another terminal)
//        npm run lighthouse            [BASE_URL=http://localhost:3000] [CHROME_PATH=/path/to/chrome]
//
// Lighthouse runs through npx at a pinned version instead of being a devDependency: it is large and
// only needed for this audit (D-033).
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const LIGHTHOUSE = 'lighthouse@13.5.0';
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const PAGES = process.env.PAGES?.split(',') ?? [
  '/ar',
  '/fr',
  '/en',
  '/fr/artists',
  '/ar/artists/demo-al-amwaj',
  '/fr/events/demo-soiree-jazz',
  '/ar/news/demo-appel-benevoles',
];
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];
const MINIMUM = 90;
const outDir = fileURLToPath(new URL('../.lighthouse/', import.meta.url));

mkdirSync(outDir, { recursive: true });

const rows = [];
let failed = false;

for (const page of PAGES) {
  const url = `${BASE_URL}${page}`;
  const base = `${outDir}${page.slice(1).replaceAll('/', '-') || 'root'}`;
  execFileSync(
    'npx',
    [
      '--yes',
      LIGHTHOUSE,
      url,
      '--quiet',
      '--form-factor=mobile',
      `--only-categories=${CATEGORIES.join(',')}`,
      '--output=json',
      '--output=html',
      `--output-path=${base}`,
      '--chrome-flags=--headless=new --no-sandbox --disable-gpu',
    ],
    { stdio: ['ignore', 'ignore', 'inherit'], env: process.env },
  );

  const lhr = JSON.parse(readFileSync(`${base}.report.json`, 'utf8'));
  const scores = Object.fromEntries(
    CATEGORIES.map((id) => [id, Math.round((lhr.categories[id]?.score ?? 0) * 100)]),
  );
  if (Object.values(scores).some((score) => score < MINIMUM)) failed = true;
  rows.push({ page, ...scores });
}

console.table(rows);
console.log(`Reports: ${outDir}`);
if (failed) {
  console.error(`At least one category is below ${MINIMUM}.`);
  process.exit(1);
}
