import fs from 'node:fs';
import path from 'node:path';
import { expect } from '@playwright/test';

export const DEMO = {
  buyer: { email: 'buyer@artisanscorner.demo', password: 'DemoBuyer123!' },
  vendor: { email: 'vendor@artisanscorner.demo', password: 'DemoVendor123!' },
  admin: { email: 'admin@artisanscorner.demo', password: 'DemoAdmin123!' },
};

/** Signs in through the real form and waits for the session to settle. */
export async function signIn(page, { email, password }) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  /* Wait on the account menu, not the cart link: the cart renders whether or
     not sign-in succeeded, so it would hide a failed login. */
  await expect(page.getByRole('button', { name: /Account menu/ })).toBeVisible();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'));
}

/** A unique-enough suffix so repeated runs do not collide on unique fields. */
export const unique = () => Math.random().toString(36).slice(2, 8);

/**
 * A real 800x800 PNG for exercising the upload path.
 *
 * This used to be a 1x1 pixel, which the upload accepted quite happily - but
 * while the test ran, the product it created showed a single colour stretched
 * across a card in the live shop. A test should not make the application look
 * broken, even for the seconds it exists.
 *
 * Kept as a committed fixture rather than generated here: Playwright's loader
 * allows neither top-level await nor import.meta in a helper module, and a
 * fixture on disk is one fewer moving part. Regenerate it with
 * scripts/generate-test-fixture.mjs.
 *
 * Playwright runs from the directory holding playwright.config.js, so the
 * fixture resolves from there.
 */
const FIXTURE = path.join(process.cwd(), 'e2e', 'fixtures', 'test-upload.png');
if (!fs.existsSync(FIXTURE)) {
  throw new Error(`Missing ${FIXTURE} - run: node scripts/generate-test-fixture.mjs`);
}
export const PNG_BYTES = fs.readFileSync(FIXTURE);
