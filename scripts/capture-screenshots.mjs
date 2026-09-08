/**
 * Captures the screenshots the README embeds.
 *
 *   npm run dev:memory        # in one terminal
 *   npm run docs:screenshots  # in another
 *
 * Uses the Chrome already on the machine. Shots are viewport-sized rather than
 * full-page, so they look like screenshots rather than tall strips.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from '@playwright/test';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(repoRoot, 'docs', 'screenshots');
const BASE = process.env.E2E_BASE_URL || 'http://localhost:5273';

const DEMO = {
  buyer: { email: 'buyer@artisanscorner.demo', password: 'DemoBuyer123!' },
  vendor: { email: 'vendor@artisanscorner.demo', password: 'DemoVendor123!' },
  admin: { email: 'admin@artisanscorner.demo', password: 'DemoAdmin123!' },
};

const reachable = await fetch(`${BASE.replace('5273', '5055')}/api/health`)
  .then((r) => r.ok)
  .catch(() => false);
if (!reachable) {
  console.error(`\nThe app is not running. Start it first:\n  npm run dev:memory\n`);
  process.exit(2);
}

fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });

/* Vite keeps an HMR websocket open, so 'networkidle' never fires in dev.
   Wait for the DOM plus the images instead, with a hard ceiling per page. */
const STEP_TIMEOUT = 20_000;

/** Lets lazy images decode and animations settle before the shutter. */
async function settle(page) {
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  // Nudge lazy images into view, then give them a bounded window to decode.
  await page
    .evaluate(async () => {
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise((r) => setTimeout(r, 250));
      window.scrollTo(0, 0);
    })
    .catch(() => {});
  await page
    .waitForFunction(() => Array.from(document.images).every((i) => i.complete), null, {
      timeout: STEP_TIMEOUT,
    })
    .catch(() => {});
  await page.waitForTimeout(400);
}

async function signIn(page, { email, password }) {
  /* Drop any existing session first: the login page redirects away the moment
     it sees one, which detaches the form mid-click when switching roles. */
  await page.goto(BASE);
  await page.evaluate(() => localStorage.clear()).catch(() => {});
  await page.goto(`${BASE}/login`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('button', { name: /Account menu/ }).waitFor();
}

const shots = [];
async function shoot(page, name, { fullPage = false } = {}) {
  await settle(page);
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage });
  shots.push(name);
  console.log(`  ${name}.png`);
}

/* ---------------------------------------------------------------- desktop */
console.log('desktop (1440x900)');
const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await desktop.newPage();
page.setDefaultTimeout(STEP_TIMEOUT);
page.setDefaultNavigationTimeout(STEP_TIMEOUT);

await page.goto(BASE);
await shoot(page, '01-home');

await page.goto(`${BASE}/shop`);
await shoot(page, '02-shop');

await page.goto(`${BASE}/product/hand-painted-ceramic-vase`);
await shoot(page, '03-product');

// Reviews sit lower on the product page.
await page.evaluate(() => document.getElementById('reviews-heading')?.scrollIntoView());
await page.waitForTimeout(400);
await shoot(page, '04-reviews');

await signIn(page, DEMO.buyer);
await page.goto(`${BASE}/shop`);
await page.locator('article').first().getByRole('button', { name: /Add .* to cart/ }).click();
await page.goto(`${BASE}/cart`);
await shoot(page, '05-cart');

await page.goto(`${BASE}/checkout`);
await page.getByRole('button', { name: 'Continue to shipping' }).click();
await shoot(page, '06-checkout-shipping');

await page.goto(`${BASE}/orders`);
await shoot(page, '07-orders');
const firstOrder = page.getByRole('link', { name: 'View order' }).first();
if (await firstOrder.count()) {
  await firstOrder.click();
  await shoot(page, '08-order-tracking');
}

await signIn(page, DEMO.vendor);
for (const [route, name] of [
  ['/dashboard/seller', '09-vendor-overview'],
  ['/dashboard/seller/products', '10-vendor-products'],
  ['/dashboard/seller/analytics', '11-vendor-analytics'],
  ['/dashboard/seller/earnings', '12-vendor-earnings'],
  ['/dashboard/seller/orders', '13-vendor-orders'],
]) {
  await page.goto(BASE + route);
  await shoot(page, name);
}

await signIn(page, DEMO.admin);
for (const [route, name] of [
  ['/dashboard/admin', '14-admin-overview'],
  ['/dashboard/admin/revenue', '15-admin-revenue'],
  ['/dashboard/admin/users', '16-admin-users'],
]) {
  await page.goto(BASE + route);
  await shoot(page, name);
}
await desktop.close();

/* ----------------------------------------------------------------- mobile */
console.log('mobile (Pixel 5)');
const mobile = await browser.newContext({ ...devices['Pixel 5'] });
const phone = await mobile.newPage();
phone.setDefaultTimeout(STEP_TIMEOUT);
phone.setDefaultNavigationTimeout(STEP_TIMEOUT);

await phone.goto(BASE);
await shoot(phone, '17-mobile-home');

await phone.goto(`${BASE}/shop`);
await shoot(phone, '18-mobile-shop');

await signIn(phone, DEMO.vendor);
await phone.goto(`${BASE}/dashboard/seller`);
await shoot(phone, '19-mobile-vendor-dashboard');

await mobile.close();
await browser.close();

console.log(`\n${shots.length} screenshots written to docs/screenshots`);
