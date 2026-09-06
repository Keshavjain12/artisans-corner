import { expect, test } from '@playwright/test';
import { DEMO, signIn } from './helpers.js';

/**
 * Runs on the `mobile` project (Pixel 5). The brief asks for a mobile
 * experience that is not a squashed desktop, so these assert the behaviour
 * actually changes rather than just that the page fits.
 */
test.describe('on a phone', () => {
  test('navigation collapses into a menu', async ({ page }) => {
    await page.goto('/');

    // The desktop nav is hidden; the hamburger takes over.
    const openMenu = page.getByRole('button', { name: 'Open menu' });
    await expect(openMenu).toBeVisible();

    await openMenu.click();
    const mobileNav = page.getByRole('navigation', { name: 'Mobile' });
    await expect(mobileNav).toBeVisible();
    await expect(mobileNav.getByRole('link', { name: 'Shop' })).toBeVisible();

    await mobileNav.getByRole('link', { name: 'Shop' }).click();
    await expect(page).toHaveURL(/\/shop/);
    await expect(page.getByRole('navigation', { name: 'Mobile' })).toBeHidden();
  });

  test('the product grid reflows instead of shrinking', async ({ page }) => {
    await page.goto('/shop');
    await expect(page.locator('article').first()).toBeVisible();

    const cards = page.locator('article');
    const first = await cards.nth(0).boundingBox();
    const second = await cards.nth(1).boundingBox();

    // Two columns on a phone, not four squashed ones.
    expect(Math.abs(first.y - second.y)).toBeLessThan(20);
    const third = await cards.nth(2).boundingBox();
    expect(third.y).toBeGreaterThan(first.y + first.height - 20);
  });

  test('nothing overflows the viewport horizontally', async ({ page }) => {
    for (const path of ['/', '/shop', '/cart', '/login']) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow, `${path} overflows horizontally by ${overflow}px`).toBeLessThanOrEqual(1);
    }
  });

  test('dashboard tables scroll rather than overflow the page', async ({ page }) => {
    await signIn(page, DEMO.vendor);
    await page.goto('/dashboard/seller/products');

    const scroller = page.locator('.overflow-x-auto').first();
    await expect(scroller).toBeVisible();

    const pageOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(pageOverflow).toBeLessThanOrEqual(1);
  });

  test('checkout is usable on a phone', async ({ page }) => {
    await signIn(page, DEMO.buyer);
    await page.goto('/shop');
    await page.locator('article').first().getByRole('button', { name: /Add .* to cart/ }).click();

    await page.goto('/checkout');
    await page.getByRole('button', { name: 'Continue to shipping' }).click();

    const nameField = page.getByLabel('Full name');
    await expect(nameField).toBeVisible();

    // Tap targets should not be hairline-thin on a touch screen.
    const box = await nameField.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(36);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
