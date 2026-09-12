import { chromium } from '@playwright/test';

const SITE = (process.env.SITE || process.argv[2] || 'http://localhost:5273').replace(/\/$/, '');

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.setDefaultTimeout(90000);

const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const step = (text) => console.log(`  ${text}`);

let ok = false;
try {
  console.log(`\nPaying with a Stripe test card on ${SITE}\n`);

  await page.goto(`${SITE}/login`);
  await page.getByRole('button', { name: /Demo buyer/ }).click();
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('button', { name: /Account menu/ }).waitFor();
  step('signed in as the demo buyer');

  await page.goto(`${SITE}/shop?inStock=true`);
  const card = page.locator('article').first();
  const name = (await card.getByRole('heading').innerText()).trim();
  await card.getByRole('button', { name: /Add .* to cart/ }).click();
  step(`added "${name}" to the cart`);

  await page.goto(`${SITE}/checkout`);
  await page.getByRole('button', { name: 'Continue to shipping' }).click();
  await page.getByLabel('Full name').fill('Ava Thompson');
  await page.getByLabel(/^Address/).fill('14 Rosewood Lane');
  await page.getByLabel('City').fill('Brooklyn');
  await page.getByLabel('State / region').fill('New York');
  await page.getByLabel('Postal code').fill('11215');
  await page.getByLabel('Country').fill('United States');
  await page.getByLabel('Phone').fill('+1 917 555 0143');
  await page.getByRole('button', { name: 'Continue to payment' }).click();

  if (await page.getByText('Simulated payment mode').isVisible().catch(() => false)) {
    throw new Error('this site has no Stripe keys - checkout is in simulated-payment mode');
  }

  const frame = page.frameLocator('iframe[title="Secure payment input frame"]').first();
  const number = frame.locator('input[name="number"]');
  await number.waitFor();
  step("Stripe's card form loaded");

  await number.fill('4242424242424242');
  await frame.locator('input[name="expiry"]').fill('12 / 34');
  await frame.locator('input[name="cvc"]').fill('123');
  const country = frame.locator('select[name="country"]');
  if (await country.count()) await country.selectOption('US');
  const zip = frame.locator('input[name="postalCode"]');
  if ((await zip.count()) && (await zip.isVisible())) await zip.fill('11215');
  step('test card 4242 4242 4242 4242 entered');

  await page.getByRole('button', { name: /^Pay / }).click();
  await page.getByRole('heading', { name: /your order is confirmed/i }).waitFor();
  const order = (await page.getByText(/^AC-/).first().innerText()).trim();
  step(`payment accepted - order ${order}`);

  const cart = await page.getByRole('link', { name: /Cart, \d+ items/ }).getAttribute('aria-label');
  if (cart !== 'Cart, 0 items') throw new Error(`the cart was not cleared (${cart})`);
  step('cart cleared');

  if (errors.length) throw new Error(`browser errors: ${errors.join(' | ')}`);
  ok = true;
} catch (error) {
  console.error(`\n  FAILED: ${error.message}`);
} finally {
  await browser.close();
}

console.log(ok ? '\nStripe checkout works end to end.\n' : '');
process.exitCode = ok ? 0 : 1;
