#!/usr/bin/env node
// Reports the compressed size of the Cloudflare Worker and fails above the Workers Free limit.
// Run after `npm run cf:build`. Uses `wrangler deploy --dry-run`, so no Cloudflare account is needed.
import { execFileSync } from 'node:child_process';

const LIMIT_KIB = 3 * 1024; // Workers Free: 3 MiB after compression.
const WARN_RATIO = 0.8;

const output = execFileSync(
  'npx',
  ['wrangler', 'deploy', '--dry-run', '--outdir', '.wrangler/dry-run'],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] },
);

const match = output.match(/Total Upload:\s*([\d.]+)\s*KiB\s*\/\s*gzip:\s*([\d.]+)\s*KiB/);
if (!match) {
  console.error('Could not read the bundle size from wrangler output:\n' + output);
  process.exit(1);
}

const [, raw, gzip] = match.map(Number);
const ratio = gzip / LIMIT_KIB;
console.log(
  `Worker bundle: ${(raw / 1024).toFixed(2)} MiB raw, ${(gzip / 1024).toFixed(2)} MiB gzip ` +
    `(${Math.round(ratio * 100)}% of the ${LIMIT_KIB / 1024} MiB Workers Free limit).`,
);

if (gzip > LIMIT_KIB) {
  console.error('Over the Workers Free limit. See docs/decisions.md (hosting) before merging.');
  process.exit(1);
}
if (ratio > WARN_RATIO) {
  console.warn(`Warning: above ${WARN_RATIO * 100}% of the limit.`);
}
