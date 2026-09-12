import { expect, test } from '@playwright/test';
import { unique } from './helpers.js';

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

    await page.goto('/shop?inStock=true');
    const card = page.locator('article').first();
    const productName = (await card.getByRole('heading').innerText()).trim();
    await card.getByRole('heading').getByRole('link').click();
    await expect(page.getByRole('heading', { level: 1, name: productName })).toBeVisible();
    const productUrl = page.url();

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

    await page.goto(productUrl);
    await expect(page.getByText('Write your review')).toBeVisible();
    await expect(page.getByText(/Only verified buyers/)).toBeHidden();

    await page.getByLabel(/Headline/).fill('Better in the hand');
    await page
      .getByLabel(/Your review/)
      .fill('Packed with real care, and the glaze has more depth in daylight.');
    await page.getByRole('button', { name: 'Post review' }).click();

    await expect(page.getByText(/You reviewed this piece/)).toBeVisible();
    await expect(page.getByText(/Only verified buyers/)).toBeHidden();
    await expect(page.getByText('Better in the hand')).toBeVisible();

    await page.reload();
    await expect(page.getByText(/You reviewed this piece/)).toBeVisible();

    await page.getByRole('button', { name: 'Edit your review' }).click();
    const comment = page.getByLabel(/Your review/);
    await expect(comment).toHaveValue(/glaze has more depth/);
    await comment.fill('It has grown on me - the size suits the shelf perfectly.');
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(page.getByText(/You reviewed this piece/)).toBeVisible();
    await expect(page.getByText('It has grown on me', { exact: false })).toBeVisible();

    await expect(page.getByText('Review Tester', { exact: true })).toHaveCount(1);
  });

  test('the seed flags what it has already reviewed', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /Demo buyer/ }).click();
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('button', { name: /Account menu/ })).toBeVisible();

    const orders = await (await page.request.get('/api/orders/my-orders?limit=50')).json();
    expect(orders.data.length).toBe(orders.meta.total);
    const pending = await (await page.request.get('/api/reviews/pending')).json();
    const reviewable = new Set(pending.data.map((entry) => String(entry.productId)));

    const reviewed = orders.data.flatMap((order) =>
      order.items.filter((item) => item.reviewed).map((item) => String(item.product))
    );
    expect(reviewed.length).toBeGreaterThan(0);
    expect(reviewable.size).toBeGreaterThan(0);
    for (const productId of reviewed) {
      expect(reviewable.has(productId)).toBe(false);
    }

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
