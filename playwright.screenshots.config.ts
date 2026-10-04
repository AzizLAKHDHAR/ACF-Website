import { defineConfig } from '@playwright/test';

// `npm run screenshots`: captures the shell in every locale × theme × viewport, including the
// hidden areas, which only render in development with ACF_PREVIEW_HIDDEN_AREAS=1 (see
// src/lib/auth/guards.ts). Output: test-results/screenshots/ and docs/screenshots/phase-1/.
const PORT = 3100;

export default defineConfig({
  testDir: 'tests/screenshots',
  timeout: 10 * 60_000,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined },
  },
  webServer: {
    command: `next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/en`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: { ACF_PREVIEW_HIDDEN_AREAS: '1', NEXT_TELEMETRY_DISABLED: '1' },
  },
});
