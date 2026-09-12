import { expect, test } from '@playwright/test';
import { DEMO, signIn, unique } from './helpers.js';

test.describe('accounts', () => {
  test('a visitor can register and lands signed in', async ({ page }) => {
    const email = `e2e-${unique()}@example.com`;

    await page.goto('/register');
    await page.getByLabel(/^Name/).fill('Keshav raj Jain');
    await page.getByLabel(/^Email/).fill(email);
    await page.getByLabel(/^Password/).fill('Passw0rd123');
    await page.getByLabel(/^Confirm password/).fill('Passw0rd123');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByText('Please tell us your name')).toBeHidden();
    await expect(page).toHaveURL('/');

    await page.goto('/account');
    await expect(page.getByRole('heading', { name: 'My profile' })).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();
  });

  test('registration rejects a mismatched confirmation', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel(/^Name/).fill('Mismatch Tester');
    await page.getByLabel(/^Email/).fill(`e2e-${unique()}@example.com`);
    await page.getByLabel(/^Password/).fill('Passw0rd123');
    await page.getByLabel(/^Confirm password/).fill('Passw0rd124');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByText('Passwords do not match')).toBeVisible();
    await expect(page).toHaveURL(/\/register/);
  });

  test('registration refuses an email already in use', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel(/^Name/).fill('Duplicate Tester');
    await page.getByLabel(/^Email/).fill(DEMO.buyer.email);
    await page.getByLabel(/^Password/).fill('Passw0rd123');
    await page.getByLabel(/^Confirm password/).fill('Passw0rd123');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByRole('alert')).toContainText('already exists');
  });

  test('a wrong password is refused', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(DEMO.buyer.email);
    await page.getByLabel('Password').fill('DefinitelyWrong1');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByRole('alert')).toContainText('Incorrect email or password');
  });

  test('the demo account buttons fill the form', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /Demo vendor/ }).click();

    await expect(page.getByLabel('Email')).toHaveValue(DEMO.vendor.email);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/');
  });

  test('signing out clears the session', async ({ page }) => {
    await signIn(page, DEMO.buyer);

    await page.getByRole('button', { name: /Account menu/ }).click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();

    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();

    await page.goto('/orders');
    await expect(page).toHaveURL(/\/login/);
  });

  test('a buyer cannot reach the admin dashboard', async ({ page }) => {
    await signIn(page, DEMO.buyer);
    await page.goto('/dashboard/admin');
    await expect(page).toHaveURL('/');
  });

  test('a buyer heading for the seller dashboard is offered onboarding', async ({ page }) => {
    await signIn(page, DEMO.buyer);
    await page.goto('/dashboard/seller');
    await expect(page).toHaveURL(/become-a-seller/);
    await expect(page.getByRole('heading', { name: 'Open your shop' })).toBeVisible();
  });
});
