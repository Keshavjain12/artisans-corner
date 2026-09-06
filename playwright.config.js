import { defineConfig, devices } from '@playwright/test';

const PORT = 5273;
const BASE_URL = process.env.E2E_BASE_URL || `http://localhost:${PORT}`;

/**
 * Browser-level end-to-end suite.
 *
 * Uses the Chrome already installed on the machine (`channel: 'chrome'`) rather
 * than downloading a browser, so a fresh clone can run this immediately.
 * If Chrome is not installed, run `npx playwright install chromium` and drop
 * the `channel` line.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  projects: [
    {
      name: 'chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
      testIgnore: /responsive\.spec\.js/,
    },
    {
      // The brief asks for a mobile experience that is not a squashed desktop.
      name: 'mobile',
      use: { ...devices['Pixel 5'], channel: 'chrome' },
      testMatch: /responsive\.spec\.js/,
    },
  ],

  webServer: {
    command: 'npm run dev:memory',
    /* Gate on the API, not the Vite port: Vite is ready in under a second
       while the API is still seeding, so waiting on the client would start the
       run against an empty database. */
    url: 'http://localhost:5055/api/health',
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
