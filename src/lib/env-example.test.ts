import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');

describe('.env.example', () => {
  it('lists every variable documented in docs/architecture.md → Configuration', () => {
    const architecture = read('../../docs/architecture.md');
    const section = architecture.split('### Configuration')[1]?.split('\n## ')[0] ?? '';
    const documented = [...section.matchAll(/`([A-Z][A-Z0-9_]+)`/g)].map((m) => m[1]);
    expect(documented.length).toBeGreaterThan(10);

    const example = read('../../.env.example');
    const declared = new Set([...example.matchAll(/^([A-Z][A-Z0-9_]+)=/gm)].map((m) => m[1]));
    const missing = documented.filter((name) => !declared.has(name ?? ''));
    expect(missing).toEqual([]);
  });

  it('never ships a value for a secret', () => {
    const example = read('../../.env.example');
    for (const name of [
      'SUPABASE_SECRET_KEY',
      'RESEND_API_KEY',
      'DISCORD_BOT_TOKEN',
      'CRON_SECRET',
    ]) {
      expect(example).toMatch(new RegExp(`^${name}=$`, 'm'));
    }
  });
});
