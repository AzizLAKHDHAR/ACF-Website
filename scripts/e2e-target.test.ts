import { describe, expect, it } from 'vitest';
import { assertLocalSupabase, isLocalSupabase, supabaseUrlUnderTest } from './e2e-target';

const HOSTED = 'https://abcdefghijklmnop.supabase.co';
const LOCAL = 'http://127.0.0.1:54321';

describe('isLocalSupabase', () => {
  it('accepts the local stack', () => {
    for (const url of [
      LOCAL,
      'http://localhost:54321',
      'http://[::1]:54321',
      'http://api.localhost',
    ])
      expect(isLocalSupabase(url), url).toBe(true);
  });

  it('refuses hosted projects and look-alike hosts', () => {
    for (const url of [
      HOSTED,
      'http://127.0.0.1.example.com',
      'http://localhost.example.com',
      'not a url',
    ])
      expect(isLocalSupabase(url), url).toBe(false);
  });
});

describe('supabaseUrlUnderTest', () => {
  const files = (map: Record<string, string>) => (path: string) => map[path] ?? null;

  it('prefers the environment (CI, or .env.local loaded by the Playwright config)', () => {
    expect(
      supabaseUrlUnderTest(
        { NEXT_PUBLIC_SUPABASE_URL: LOCAL },
        files({ '.env': `NEXT_PUBLIC_SUPABASE_URL=${HOSTED}` }),
      ),
    ).toBe(LOCAL);
  });

  it('then reads the env files in the order Next does', () => {
    expect(
      supabaseUrlUnderTest(
        {},
        files({ '.env.production': 'OTHER=1', '.env': `NEXT_PUBLIC_SUPABASE_URL=${HOSTED}` }),
      ),
    ).toBe(HOSTED);
    expect(
      supabaseUrlUnderTest(
        {},
        files({
          '.env.production.local': 'NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321',
          '.env': `NEXT_PUBLIC_SUPABASE_URL=${HOSTED}`,
        }),
      ),
    ).toBe('http://localhost:54321');
  });

  it('is null when nothing configures Supabase', () => {
    expect(supabaseUrlUnderTest({}, files({}))).toBeNull();
  });
});

describe('assertLocalSupabase', () => {
  it('lets local and unconfigured runs through', () => {
    expect(() => assertLocalSupabase(LOCAL)).not.toThrow();
    expect(() => assertLocalSupabase(null)).not.toThrow();
  });

  it('stops a run that would reach a hosted project, naming only its host', () => {
    expect(() => assertLocalSupabase(`${HOSTED}/rest/v1`)).toThrow(
      /abcdefghijklmnop\.supabase\.co.*npm run db:start/s,
    );
    expect(() => assertLocalSupabase(`${HOSTED}/rest/v1`)).not.toThrow(/rest\/v1/);
  });
});
