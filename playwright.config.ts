import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// The auth specs talk to the local Supabase stack; `npm run db:env` writes its URL and keys here.
if (existsSync('.env.local')) process.loadEnvFile('.env.local');

// The contact form and the revalidation webhook need these at build and run time. CI sets the same
// values in its environment (ci.yml); these defaults cover local runs. Test-only values, no secrets.
const e2eEnv = {
  RESEND_API_URL: 'http://127.0.0.1:3999',
  RESEND_API_KEY: 're_e2e_test_key',
  EMAIL_FROM: 'ACF <no-reply@acf.test>',
  CONTACT_EMAIL_TO: 'contact@acf.test',
  CONTENT_WEBHOOK_SECRET: 'e2e-content-webhook-secret-0123456789abcdef',
};
for (const [key, value] of Object.entries(e2eEnv)) process.env[key] ??= value;

const PORT = Number(process.env.PORT ?? 3000);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    // Claude Code cloud sessions ship a Chromium whose revision may differ from the one
    // @playwright/test expects; the session hook exports its path. CI installs the right one.
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    {
      // Tests run against the production build (`npm run build` first in CI).
      command: process.env.CI ? 'npm run start' : 'npm run build && npm run start',
      url: `${baseURL}/en`,
      reuseExistingServer: !process.env.CI,
      timeout: 240_000,
      env: { PORT: String(PORT) },
    },
    {
      command: 'node tests/e2e/mock-resend.mjs',
      url: 'http://127.0.0.1:3999/health',
      reuseExistingServer: !process.env.CI,
    },
  ],
});
