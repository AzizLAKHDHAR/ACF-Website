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
      ],
    },
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
    '.open-next/**',
    '.wrangler/**',
    'playwright-report/**',
    'test-results/**',
    'cloudflare-env.d.ts',
  ]),
]);
