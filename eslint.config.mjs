import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

// Physical direction utilities break the Arabic (RTL) layout. Use logical ones instead:
// ms/me, ps/pe, start/end, text-start/text-end, rounded-s/e, border-s/e (CLAUDE.md → i18n and RTL rules).
const PHYSICAL_DIRECTION_CLASS =
  '/(^|[\\s:])-?(m[lr]|p[lr]|left|right|rounded-[lr]|rounded-[tb][lr]|border-[lr]|scroll-[mp][lr])-|(^|[\\s:])text-(left|right)(\\s|$)/';
const physicalDirectionMessage =
  'Use logical Tailwind utilities (ms-/me-/ps-/pe-/start-/end-/text-start/text-end/rounded-s/border-s) so the layout mirrors in Arabic.';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: `Literal[value=${PHYSICAL_DIRECTION_CLASS}]`,
          message: physicalDirectionMessage,
        },
        {
          selector: `TemplateElement[value.raw=${PHYSICAL_DIRECTION_CLASS}]`,
          message: physicalDirectionMessage,
        },
        {
          // Identity comes from a verified JWT (CLAUDE.md → Security rule 3).
          selector: "CallExpression[callee.property.name='getSession']",
          message:
            'Use supabase.auth.getClaims() (or getUser()) on the server, never getSession().',
        },
      ],
      // The service-role client bypasses RLS. Allowed callers are listed below and in docs/roles.md.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/lib/supabase/admin', '**/lib/supabase/admin', './admin'],
              message:
                'The service-role client is allowed only in src/app/api/cron/**, src/app/api/webhooks/** and account deletion (docs/roles.md → System actor).',
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      'src/app/api/cron/**/*.ts',
      'src/app/api/webhooks/**/*.ts',
      'src/features/account/delete-account.ts',
    ],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    // Every user-facing string goes through next-intl; JSX text literals are not allowed.
    files: ['src/**/*.tsx'],
    ignores: ['src/**/*.test.tsx'],
    rules: {
      'react/jsx-no-literals': [
        'error',
        {
          noStrings: false,
          ignoreProps: true,
          allowedStrings: ['·', '–', '—', '/', '|', '©', '404'],
        },
      ],
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'playwright-report/**',
    'test-results/**',
  ]),
]);
