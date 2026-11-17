import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

// The e2e suite signs people up, writes rows and uploads files, so it must only ever run against the
// local Supabase stack, never a hosted project with real people's data (D-079). Playwright hands its own
// environment to the app it starts (CI's, plus .env.local, which playwright.config.ts loads), and Next
// lets the environment win over env files; after that, Next reads .env.production.local,
// .env.production and .env, in that order.
const ENV_FILES = ['.env.production.local', '.env.production', '.env'] as const;

type ReadFile = (path: string) => string | null;

const readIfExists: ReadFile = (path) => (existsSync(path) ? readFileSync(path, 'utf8') : null);

/** The Supabase URL the app under test will use, or null when nothing configures one. */
export function supabaseUrlUnderTest(
  env: Record<string, string | undefined> = process.env,
  readFile: ReadFile = readIfExists,
): string | null {
  if (env.NEXT_PUBLIC_SUPABASE_URL) return env.NEXT_PUBLIC_SUPABASE_URL;
  for (const file of ENV_FILES) {
    const content = readFile(file);
    const value = content === null ? undefined : parseEnv(content).NEXT_PUBLIC_SUPABASE_URL;
    if (value) return value;
  }
  return null;
}

/** localhost, 127.0.0.1, ::1 or a `*.localhost` name: the stack `npm run db:start` runs. */
export function isLocalSupabase(url: string): boolean {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return false;
  }
  return ['localhost', '127.0.0.1', '[::1]'].includes(host) || host.endsWith('.localhost');
}

/** Stops the run before any server starts when the app would talk to a hosted project. */
export function assertLocalSupabase(url: string | null = supabaseUrlUnderTest()): void {
  if (url === null || isLocalSupabase(url)) return;
  let host = url;
  try {
    host = new URL(url).host;
  } catch {
    // Not a URL at all: name it as written.
  }
  throw new Error(
    'The e2e tests create accounts, rows and files, so they only run against the local Supabase ' +
      `stack, but the app would use ${host}. Start it with \`npm run db:start\`, then run ` +
      '`npm run db:env` (it writes .env.local, which is read before .env) and try again.',
  );
}
