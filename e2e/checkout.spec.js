import { expect, test } from '@playwright/test';
import { DEMO, signIn } from './helpers.js';

/**
 * The walk a human would do: find something, buy it, and check the order.
 *
 * With no Stripe keys configured the server runs its simulated payment
 * provider, so the card form is replaced by a labelled button - but the order,
 * inventory movement, commission split and vendor payout are all created for
 * real by the same server code.
 */
test.describe('buying something', () => {
  test('browse, add to cart, check out, and see the order', async ({ page }) => {
    await signIn(page, DEMO.buyer);

    await page.goto('/shop');
    await expect(page.getByRole('heading', { name: 'The marketplace' })).toBeVisible();

    // Open the first in-stock product.
    const firstProduct = page.locator('article').first();
    const productName = (await firstProduct.getByRole('heading').innerText()).trim();
    // A card links to the product twice (image and title); the heading is the stable one.
    await firstProduct.getByRole('heading').getByRole('link').click();

    await expect(page.getByRole('heading', { level: 1, name: productName })).toBeVisible();
    const priceText = await page.locator('span.font-display').first().innerText();

    await page.getByRole('button', { name: 'Add to cart' }).click();
    await expect(page.getByRole('link', { name: /Cart, 1 items/ })).toBeVisible();

    await page.getByRole('link', { name: /Cart, 1 items/ }).click();
    await expect(page.getByRole('heading', { name: 'Your cart' })).toBeVisible();
    await expect(page.getByText(productName, { exact: false }).first()).toBeVisible();

    await page.getByRole('button', { name: 'Continue to checkout' }).click();
    await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();

    // Step 1 - review
    await page.getByRole('button', { name: 'Continue to shipping' }).click();

    // Step 2 - shipping
    await page.getByLabel('Full name').fill('Ava Thompson');
    // Labels carry a required asterisk, so anchor rather than match exactly.
    await page.getByLabel(/^Address/).fill('14 Rosewood Lane');
    await page.getByLabel('City').fill('Brooklyn');
    await page.getByLabel('State / region').fill('New York');
    await page.getByLabel('Postal code').fill('11215');
    await page.getByLabel('Country').fill('United States');
    await page.getByLabel('Phone').fill('+1 917 555 0143');
    await page.getByRole('button', { name: 'Continue to payment' }).click();

    // Step 3 - payment
    await expect(page.getByRole('heading', { name: 'Payment' })).toBeVisible();
    await expect(page.getByText('Simulated payment mode')).toBeVisible();
    await page.getByRole('button', { name: /Complete simulated payment/ }).click();

    // Step 4 - confirmation
    await expect(page.getByRole('heading', { name: /your order is confirmed/i })).toBeVisible({
      timeout: 20_000,
    });
    const orderNumber = await page.getByText(/^AC-/).first().innerText();
    expect(orderNumber).toMatch(/^AC-/);

    // The cart empties once the order exists.
    await expect(page.getByRole('link', { name: 'Cart, 0 items' })).toBeVisible();

    // And the order shows up in the buyer's history.
    await page.goto('/orders');
    await expect(page.getByText(orderNumber)).toBeVisible();
    await expect(page.getByText(priceText).first()).toBeVisible();
  });

  test('shipping details are validated before payment can start', async ({ page }) => {
    await signIn(page, DEMO.buyer);
    await page.goto('/shop');
    await page.locator('article').first().getByRole('button', { name: /Add .* to cart/ }).click();

    await page.goto('/checkout');
    await page.getByRole('button', { name: 'Continue to shipping' }).click();

    /* The form prefills from the account and from any address the buyer saved
       on a previous order, so clear the fields under test rather than assuming
       they start empty. */
    await page.getByLabel('Full name').fill('');
    await page.getByLabel('City').fill('');
    await page.getByLabel('Country').fill('');
    await page.getByRole('button', { name: 'Continue to payment' }).click();

    await expect(page.getByText('Please enter the recipient name')).toBeVisible();
    await expect(page.getByText('City is required')).toBeVisible();
    await expect(page.getByText('Country is required')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Payment' })).toBeHidden();
  });

  test('the cart survives a page refresh', async ({ page }) => {
    await page.goto('/shop');
    await page.locator('article').first().getByRole('button', { name: /Add .* to cart/ }).click();
    await expect(page.getByRole('link', { name: /Cart, 1 items/ })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('link', { name: /Cart, 1 items/ })).toBeVisible();

    // A brand new tab on the same origin sees it too.
    await page.goto('/cart');
    await expect(page.getByRole('heading', { name: 'Your cart' })).toBeVisible();
    await expect(page.getByRole('button', { name: /checkout|Sign in to check out/ })).toBeVisible();
  });

  test('quantity cannot exceed what the shop has in stock', async ({ page }) => {
    await page.goto('/shop?inStock=true');
    await page.locator('article').first().getByRole('button', { name: /Add .* to cart/ }).click();
    await page.goto('/cart');

    const increase = page.getByRole('button', { name: /Increase quantity/ }).first();
    for (let i = 0; i < 30; i += 1) {
      if (await increase.isDisabled()) break;
      await increase.click();
    }

    await expect(increase).toBeDisabled();
    const quantity = await page.getByRole('spinbutton').first().inputValue();
    expect(Number(quantity)).toBeLessThanOrEqual(20);
  });

  test('signed-out shoppers are asked to sign in before checkout', async ({ page }) => {
    await page.goto('/shop');
    await page.locator('article').first().getByRole('button', { name: /Add .* to cart/ }).click();
    await page.goto('/cart');

    await page.getByRole('button', { name: 'Sign in to check out' }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
