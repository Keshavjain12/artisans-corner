import { expect, test } from '@playwright/test';

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

  expect(missing).toEqual([]);
});

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
