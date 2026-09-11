import { defineConfig, devices } from '@playwright/test';

/* The suite runs on its own pair of ports, not the development pair. Anyone
   with `npm run dev` open has a real database on 5055, and a suite that reused
   that server would register accounts and place orders in it. */
const API_PORT = 5155;
const PORT = 5373;
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
    env: {
      PORT: String(API_PORT),
      API_PORT: String(API_PORT),
      CLIENT_PORT: String(PORT),
      CLIENT_URL: `http://localhost:${PORT}`,
      SERVER_URL: `http://localhost:${API_PORT}`,
      /* Blanked deliberately. The server reads backend/.env, so once real
         credentials exist there the suite would upload its fixtures into
         somebody's actual Cloudinary library and pay network latency for every
         upload assertion. Empty values put uploads back on local disk, which
         is the path these tests are written against. */
      CLOUDINARY_CLOUD_NAME: '',
      CLOUDINARY_API_KEY: '',
      CLOUDINARY_API_SECRET: '',
      /* Same reasoning: mock payments, never a real Stripe account. */
      STRIPE_SECRET_KEY: '',
      STRIPE_PUBLISHABLE_KEY: '',
      STRIPE_WEBHOOK_SECRET: '',
      ALLOW_MOCK_PAYMENTS: 'true',
    },
    /* Gate on the API, not the Vite port: Vite is ready in under a second
       while the API is still seeding, so waiting on the client would start the
       run against an empty database. */
    url: `http://localhost:${API_PORT}/api/health`,
    /* Never reused: a leftover server means testing yesterday's code against
       yesterday's data, which has happened and is hard to spot. */
    reuseExistingServer: false,
    timeout: 240_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
