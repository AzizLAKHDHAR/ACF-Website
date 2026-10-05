#!/usr/bin/env node
// Writes the local Supabase stack's URL and keys into .env.local (gitignored), keeping any other
// lines. Run after `npm run db:start`. These are the CLI's local development keys, never a real
// project's. Usage: npm run db:env  (or `node scripts/supabase-env.mjs --print` for CI).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const status = JSON.parse(
  execFileSync('npx', ['supabase', 'status', '-o', 'json'], { encoding: 'utf8' }),
);
const values = {
  NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: status.PUBLISHABLE_KEY,
  SUPABASE_SECRET_KEY: status.SECRET_KEY,
};
for (const [key, value] of Object.entries(values)) {
  if (!value) throw new Error(`supabase status did not report ${key}; is the local stack running?`);
}

if (process.argv.includes('--print')) {
  for (const [key, value] of Object.entries(values)) console.log(`${key}=${value}`);
  process.exit(0);
}

const path = '.env.local';
const kept = existsSync(path)
  ? readFileSync(path, 'utf8')
      .split('\n')
      .filter((line) => line && !Object.keys(values).some((key) => line.startsWith(`${key}=`)))
  : [];
writeFileSync(
  path,
  [...kept, ...Object.entries(values).map(([key, value]) => `${key}=${value}`)].join('\n') + '\n',
);
console.log(`Wrote ${Object.keys(values).join(', ')} to ${path}`);
