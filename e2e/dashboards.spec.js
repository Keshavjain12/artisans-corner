import { expect, test } from '@playwright/test';
import { DEMO, PNG_BYTES, signIn, unique } from './helpers.js';

test.describe('vendor dashboard', () => {
  test('shows earnings computed from real orders', async ({ page }) => {
    await signIn(page, DEMO.vendor);
    await page.goto('/dashboard/seller');

    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
    await expect(page.getByText('Total sales')).toBeVisible();
    await expect(page.getByText('Net earnings')).toBeVisible();

    const sales = await page.locator('.card', { hasText: 'Total sales' }).first().innerText();
    expect(sales).toMatch(/\$\d/);

    await page.goto('/dashboard/seller/earnings');
    await expect(page.getByRole('heading', { name: 'Earnings' })).toBeVisible();
    await expect(page.getByText('Platform fees')).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('analytics charts render for each date range', async ({ page }) => {
    await signIn(page, DEMO.vendor);
    await page.goto('/dashboard/seller/analytics');

    await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible();
    await expect(page.locator('.recharts-surface').first()).toBeVisible();

    for (const range of ['7 days', '90 days', '1 year']) {
      await page.getByRole('button', { name: range, exact: true }).click();
      await expect(page.locator('.recharts-surface').first()).toBeVisible();
    }
  });

  test('a vendor can list a product, image and all, and it reaches the shop', async ({ page }) => {
    const name = `E2E Studio Piece ${unique()}`;

    await signIn(page, DEMO.vendor);
    await page.goto('/dashboard/seller/products/new');

    await page.getByLabel(/^Product name/).fill(name);
    await page
      .getByLabel(/^Description/)
      .fill('A hand-thrown stoneware piece made for an end-to-end test, glazed in soft matte white.');
    await page.getByLabel(/^Category/).selectOption('pottery');
    await page.getByLabel(/^Price/).fill('42');
    await page.getByLabel(/^Stock/).fill('7');
    await page.getByLabel(/^Tags/).fill('e2e, stoneware');

    await page.locator('input[type="file"]').setInputFiles({
      name: 'swatch.png',
      mimeType: 'image/png',
      buffer: PNG_BYTES,
    });
    await expect(page.getByAltText(/Product image 1|swatch/)).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: 'Publish product' }).click();

    await expect(page).toHaveURL(/dashboard\/seller\/products$/);
    await expect(page.getByText(name)).toBeVisible();

    await page.goto(`/shop?q=${encodeURIComponent(name)}`);
    await expect(page.getByRole('heading', { name })).toBeVisible();

    await page.goto('/dashboard/seller/products');
    const row = page.locator('tr', { hasText: name });
    await row.getByRole('button', { name: `Delete ${name}` }).click();
    await page.getByRole('button', { name: 'Delete product' }).click();
    await expect(page.locator('tr', { hasText: name })).toHaveCount(0);

    await page.goto(`/shop?q=${encodeURIComponent(name)}`);
    await expect(page.getByRole('heading', { name })).toBeHidden();
  });

  test('a product form refuses to publish without the required details', async ({ page }) => {
    await signIn(page, DEMO.vendor);
    await page.goto('/dashboard/seller/products/new');
    await page.getByRole('button', { name: 'Publish product' }).click();

    await expect(page.getByText('Give your piece a name')).toBeVisible();
    await expect(page.getByText('Describe your piece')).toBeVisible();
    await expect(page).toHaveURL(/products\/new/);
  });

  test('a vendor sees their orders with the address they must ship to', async ({ page }) => {
    await signIn(page, DEMO.vendor);
    await page.goto('/dashboard/seller/orders');

    await expect(page.getByRole('heading', { name: 'Orders' })).toBeVisible();
    await expect(page.getByText('Ship to').first()).toBeVisible();
    await expect(page.getByText('You earn').first()).toBeVisible();
  });
});

test.describe('admin dashboard', () => {
  test('shows platform revenue and commission', async ({ page }) => {
    await signIn(page, DEMO.admin);
    await page.goto('/dashboard/admin');

    await expect(page.getByRole('heading', { name: 'Marketplace overview' })).toBeVisible();
    await expect(page.getByText('Platform revenue', { exact: true })).toBeVisible();
    await expect(page.getByText('Gross sales', { exact: true })).toBeVisible();
    await expect(page.locator('.recharts-surface').first()).toBeVisible();

    await page.goto('/dashboard/admin/revenue');
    await expect(page.getByRole('heading', { name: /Revenue/ })).toBeVisible();
    await expect(page.getByText('Commission by vendor')).toBeVisible();
    await expect(page.getByText('Payout ledger')).toBeVisible();
  });

  test('lists users, vendors, products and orders', async ({ page }) => {
    await signIn(page, DEMO.admin);

    for (const [path, heading] of [
      ['/dashboard/admin/users', 'Users'],
      ['/dashboard/admin/vendors', 'Vendors'],
      ['/dashboard/admin/products', 'Products'],
      ['/dashboard/admin/orders', 'Orders'],
    ]) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
      await expect(page.getByRole('table')).toBeVisible();
    }
  });

  test('an admin can hide a product from the marketplace', async ({ page }) => {
    await signIn(page, DEMO.admin);
    await page.goto('/dashboard/admin/products');

    const firstRow = page.locator('tbody tr').first();
    const productName = (await firstRow.locator('td').first().innerText()).trim();

    await firstRow.getByRole('button', { name: 'Hide' }).click();
    await expect(firstRow.getByRole('button', { name: 'Publish' })).toBeVisible();

    await firstRow.getByRole('button', { name: 'Publish' }).click();
    await expect(firstRow.getByRole('button', { name: 'Hide' })).toBeVisible();
    expect(productName.length).toBeGreaterThan(0);
  });
});
