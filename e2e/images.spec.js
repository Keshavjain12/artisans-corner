import { expect, test } from '@playwright/test';

/**
 * A broken image is invisible to every other kind of test: the request returns
 * 200, the markup is right, and nothing throws - the browser just cannot decode
 * the file. That is exactly how three shop logos shipped broken, because an
 * unescaped "&" in "Kiln & Coast" made their SVG invalid XML.
 *
 * naturalWidth === 0 on a completed image is the reliable signal.
 */
const PAGES = [
  ['/', 'home'],
  ['/shop', 'shop'],
  ['/categories', 'categories'],
  ['/artisans', 'artisan directory'],
  ['/shop/kiln-coast', 'a storefront with an ampersand in its name'],
  ['/product/ribbed-stoneware-mug', 'a product page'],
];

for (const [url, label] of PAGES) {
  test(`no broken images on ${label}`, async ({ page }) => {
    await page.goto(url);
    await page.waitForLoadState('domcontentloaded');

    // Bring lazy images into view and give them a moment to decode.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    await page
      .waitForFunction(() => Array.from(document.images).every((i) => i.complete), null, {
        timeout: 15_000,
      })
      .catch(() => {});

    const broken = await page.evaluate(() =>
      Array.from(document.images)
        .filter((img) => img.complete && img.naturalWidth === 0)
        .map((img) => img.currentSrc || img.src)
    );

    expect(broken, `broken images on ${url}`).toEqual([]);
  });
}

test('every image carries alt text', async ({ page }) => {
  await page.goto('/shop');
  await page.waitForTimeout(800);

  const missing = await page.evaluate(() =>
    Array.from(document.images)
      .filter((img) => img.getAttribute('alt') === null)
      .map((img) => img.currentSrc || img.src)
  );

  // Decorative images are allowed alt="", but the attribute must be present.
  expect(missing).toEqual([]);
});
