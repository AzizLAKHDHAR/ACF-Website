import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

// Roadmap phase 2: "the service-role client can't be imported outside the allowed paths".
const lint = async (filePath: string) => {
  const eslint = new ESLint();
  const [result] = await eslint.lintText(
    "import { createAdminClient } from '@/lib/supabase/admin';\nexport const client = createAdminClient;\n",
    { filePath },
  );
  return result?.messages.filter((message) => message.ruleId === 'no-restricted-imports') ?? [];
};

describe('service-role client import guard', () => {
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
