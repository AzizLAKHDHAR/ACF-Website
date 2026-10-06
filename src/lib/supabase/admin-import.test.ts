import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

// Roadmap phase 2: "the service-role client can't be imported outside the allowed paths".
// One ESLint instance for the file: loading the config is the slow part (about a second cold).
const eslint = new ESLint();
const lint = async (filePath: string) => {
  const [result] = await eslint.lintText(
    "import { createAdminClient } from '@/lib/supabase/admin';\nexport const client = createAdminClient;\n",
    { filePath },
  );
  return result?.messages.filter((message) => message.ruleId === 'no-restricted-imports') ?? [];
};

// Real ESLint runs: generous timeout so a busy machine can't fail them (vitest's default is 5 s).
describe('service-role client import guard', { timeout: 30_000 }, () => {
  it('rejects imports from application code', async () => {
    expect(await lint('src/app/[locale]/(admin)/admin/page.tsx')).toHaveLength(1);
    expect(await lint('src/features/profiles/actions.ts')).toHaveLength(1);
    expect(await lint('src/lib/auth/guards.ts')).toHaveLength(1);
  });

  it('allows cron jobs, webhooks and account deletion', async () => {
    expect(await lint('src/app/api/cron/[job]/route.ts')).toHaveLength(0);
    expect(await lint('src/app/api/webhooks/signature/[provider]/route.ts')).toHaveLength(0);
    expect(await lint('src/features/account/delete-account.ts')).toHaveLength(0);
  });
});
