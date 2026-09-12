import { defineConfig, devices } from '@playwright/test';

const API_PORT = 5155;
const PORT = 5373;
const BASE_URL = process.env.E2E_BASE_URL || `http://localhost:${PORT}`;

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
      CLOUDINARY_CLOUD_NAME: '',
      CLOUDINARY_API_KEY: '',
      CLOUDINARY_API_SECRET: '',
      STRIPE_SECRET_KEY: '',
      STRIPE_PUBLISHABLE_KEY: '',
      STRIPE_WEBHOOK_SECRET: '',
      ALLOW_MOCK_PAYMENTS: 'true',
    },
    url: `http://localhost:${API_PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 240_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
