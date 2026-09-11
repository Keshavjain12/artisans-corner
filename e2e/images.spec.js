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

/**
 * A shop's header card is lifted over the bottom of its banner photograph. The
 * banner is positioned and the card was not, so the banner painted on top and
 * took the shop's name and logo with it - invisible while the banners were pale
 * illustrations, obvious the moment they became photographs.
 *
 * Visibility assertions do not catch this: the heading is in the layout, laid
 * out, and "visible". What matters is which element owns the pixel.
 */
test('a storefront header sits above its banner, not under it', async ({ page }) => {
  await page.goto('/shop/silver-fern-atelier');

  const heading = page.getByRole('heading', { level: 1, name: 'Silver Fern Atelier' });
  await expect(heading).toBeVisible();

  const coveredBy = await heading.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const onTop = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    if (onTop === element || element.contains(onTop)) return null;
    return onTop?.tagName.toLowerCase() ?? 'nothing';
  });

  expect(coveredBy, 'the shop name is painted over by another element').toBeNull();
});
