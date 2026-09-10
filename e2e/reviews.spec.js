import { expect, test } from '@playwright/test';
import { unique } from './helpers.js';

/**
 * Verified reviews, from the shopper's side.
 *
 * Written after a QA pass found the panel telling a buyer who had *just*
 * reviewed a piece that "only verified buyers can review this piece": the write
 * form is driven by the list of unreviewed purchases, which correctly stops
 * offering a piece once it has been reviewed, and the fallback message assumed
 * the only reason for that was never having bought it.
 *
 * Registers its own buyer rather than using a demo account, so the run does not
 * depend on which seeded pieces have already been reviewed and cannot trip the
 * one-review-per-purchase rule on a second run.
 */
test.describe('reviewing a piece you bought', () => {
  test('write, then edit - and never be called a stranger in between', async ({ page }) => {
    const email = `e2e-review-${unique()}@example.com`;
    const password = 'Passw0rd123';

    await page.goto('/register');
    await page.getByLabel(/^Name/).fill('Review Tester');
    await page.getByLabel(/^Email/).fill(email);
    await page.getByLabel(/^Password/).fill(password);
    await page.getByLabel(/^Confirm password/).fill(password);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByRole('button', { name: /Account menu/ })).toBeVisible();

    // Buy something in stock, so there is a paid order to review against.
    await page.goto('/shop?inStock=true');
    const card = page.locator('article').first();
    const productName = (await card.getByRole('heading').innerText()).trim();
    await card.getByRole('heading').getByRole('link').click();
    await expect(page.getByRole('heading', { level: 1, name: productName })).toBeVisible();
    const productUrl = page.url();

    // Before buying it, the panel is honest about why there is no form.
    await expect(page.getByText(/Only verified buyers/)).toBeVisible();

    await page.getByRole('button', { name: 'Add to cart' }).click();
    await page.goto('/checkout');
    await page.getByRole('button', { name: 'Continue to shipping' }).click();
    await page.getByLabel('Full name').fill('Review Tester');
    await page.getByLabel(/^Address/).fill('9 Potter Row');
    await page.getByLabel('City').fill('Asheville');
    await page.getByLabel('State / region').fill('North Carolina');
    await page.getByLabel('Postal code').fill('28801');
    await page.getByLabel('Country').fill('United States');
    await page.getByLabel('Phone').fill('+1 828 555 0117');
    await page.getByRole('button', { name: 'Continue to payment' }).click();
    await page.getByRole('button', { name: /Complete simulated payment/ }).click();
    await expect(page.getByRole('heading', { name: /your order is confirmed/i })).toBeVisible({
      timeout: 20_000,
    });

    // Now the piece is theirs, the form is offered.
    await page.goto(productUrl);
    await expect(page.getByText('Write your review')).toBeVisible();
    await expect(page.getByText(/Only verified buyers/)).toBeHidden();

    await page.getByLabel(/Headline/).fill('Better in the hand');
    await page
      .getByLabel(/Your review/)
      .fill('Packed with real care, and the glaze has more depth in daylight.');
    await page.getByRole('button', { name: 'Post review' }).click();

    /* The bug lived here: with the purchase now reviewed, the panel used to
       fall back to the message for someone who had never bought it. */
    await expect(page.getByText(/You reviewed this piece/)).toBeVisible();
    await expect(page.getByText(/Only verified buyers/)).toBeHidden();
    await expect(page.getByText('Better in the hand')).toBeVisible();

    // A reload proves it is the server saying so, not local state.
    await page.reload();
    await expect(page.getByText(/You reviewed this piece/)).toBeVisible();

    await page.getByRole('button', { name: 'Edit your review' }).click();
    const comment = page.getByLabel(/Your review/);
    await expect(comment).toHaveValue(/glaze has more depth/);
    await comment.fill('It has grown on me - the size suits the shelf perfectly.');
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(page.getByText(/You reviewed this piece/)).toBeVisible();
    await expect(page.getByText('It has grown on me', { exact: false })).toBeVisible();

    /* One review, not two: editing must update rather than post again. The
       piece carries seeded reviews too, so count only this tester's. */
    await expect(page.getByText('Review Tester', { exact: true })).toHaveCount(1);
  });

  test('the seed flags what it has already reviewed', async ({ page }) => {
    /* The seed writes demo reviews straight into the collection, and used to
       skip the flag the API sets on the order line. The demo buyer was then
       invited to review pieces they had already reviewed, and the API refused
       with a 409 - a dead end reached by clicking exactly what was offered. */
    await page.goto('/login');
    await page.getByRole('button', { name: /Demo buyer/ }).click();
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('button', { name: /Account menu/ })).toBeVisible();

    /* The demo buyer has more orders than one page holds, and the reviewed ones
       are the oldest - the default page of ten misses them entirely. */
    const orders = await (await page.request.get('/api/orders/my-orders?limit=50')).json();
    expect(orders.data.length).toBe(orders.meta.total);
    const pending = await (await page.request.get('/api/reviews/pending')).json();
    const reviewable = new Set(pending.data.map((entry) => String(entry.productId)));

    const reviewed = orders.data.flatMap((order) =>
      order.items.filter((item) => item.reviewed).map((item) => String(item.product))
    );
    /* The seed deliberately leaves this account with both: a piece already
       reviewed, and a piece still to review. */
    expect(reviewed.length).toBeGreaterThan(0);
    expect(reviewable.size).toBeGreaterThan(0);
    for (const productId of reviewed) {
      expect(reviewable.has(productId)).toBe(false);
    }

    // And the order page offers a review for exactly the pieces still awaiting one.
    const order = orders.data.find(
      (candidate) => candidate.paymentStatus === 'paid' && candidate.items.some((item) => item.reviewed)
    );
    expect(order).toBeTruthy();
    await page.goto(`/orders/${order._id}`);
    await expect(page.getByText(order.orderNumber)).toBeVisible();
    await expect(page.getByRole('link', { name: /Write a review/ })).toHaveCount(
      order.items.filter((item) => !item.reviewed).length
    );
  });
});
