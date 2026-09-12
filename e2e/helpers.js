import fs from 'node:fs';
import path from 'node:path';
import { expect } from '@playwright/test';

export const DEMO = {
  buyer: { email: 'buyer@artisanscorner.demo', password: 'DemoBuyer123!' },
  vendor: { email: 'vendor@artisanscorner.demo', password: 'DemoVendor123!' },
  admin: { email: 'admin@artisanscorner.demo', password: 'DemoAdmin123!' },
};

export async function signIn(page, { email, password }) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByRole('button', { name: /Account menu/ })).toBeVisible();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'));
}

export const unique = () => Math.random().toString(36).slice(2, 8);

const FIXTURE = path.join(process.cwd(), 'e2e', 'fixtures', 'test-upload.png');
if (!fs.existsSync(FIXTURE)) {
  throw new Error(`Missing ${FIXTURE} - run: node scripts/generate-test-fixture.mjs`);
}
export const PNG_BYTES = fs.readFileSync(FIXTURE);
