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

/** A real 1x1 PNG for exercising the upload path. */
export const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);
