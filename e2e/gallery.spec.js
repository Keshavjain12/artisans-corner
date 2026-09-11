import { expect, test } from '@playwright/test';
import { DEMO, PNG_BYTES, unique } from './helpers.js';

/**
 * The product gallery, across a navigation.
 *
 * "You might also like" moves between products without unmounting the page, so
 * the selected thumbnail index survived the change: going from a piece with two
 * views to one with a single photograph selected an image that did not exist and
 * rendered an empty frame. That is the same empty-image symptom that has reached
 * this project's shop twice before, and no API test can see it.
 *
 * The two-view product is created here rather than assumed: every seeded piece
 * currently has exactly one photograph, so a test that waited for a second view
 * to exist would quietly skip itself and prove nothing.
 */
test.describe('the product gallery', () => {
  test('still shows a photograph after following a related piece', async ({ page, request }) => {
    const login = await request.post('/api/auth/login', { data: DEMO.vendor });
    const { token } = (await login.json()).data;
    const auth = { Authorization: `Bearer ${token}` };

    const upload = await request.post('/api/uploads/products', {
      headers: auth,
      multipart: {
        images: { name: 'view-1.png', mimeType: 'image/png', buffer: PNG_BYTES },
      },
    });
    expect(upload.ok(), 'upload failed').toBeTruthy();
    const [first] = (await upload.json()).data.images;

    const second = await request.post('/api/uploads/products', {
      headers: auth,
      multipart: {
        images: { name: 'view-2.png', mimeType: 'image/png', buffer: PNG_BYTES },
      },
    });
    const [back] = (await second.json()).data.images;

    const suffix = unique();
    const created = await request.post('/api/products', {
      headers: auth,
      data: {
        name: `Gallery Test Piece ${suffix}`,
        description: 'A temporary piece created by the browser suite to exercise the image gallery.',
        price: 42,
        // A category with other pieces in it, so "You might also like" is populated.
        category: 'pottery',
        stock: 3,
        images: [
          { url: first.url, publicId: first.publicId, alt: 'Front view' },
          { url: back.url, publicId: back.publicId, alt: 'Back view' },
        ],
      },
    });
    expect(created.ok(), 'product creation failed').toBeTruthy();
    const product = (await created.json()).data.product;

    try {
      await page.goto(`/product/${product.slug}`);

      const thumbs = page.getByRole('button', { name: /View image \d+ of \d+/ });
      await expect(thumbs).toHaveCount(2);
      await thumbs.nth(1).click();

      // Follow a related piece, which has only one photograph.
      const related = page.locator('section', { hasText: 'You might also like' });
      await expect(related).toBeVisible();
      await related.locator('article').first().getByRole('heading').getByRole('link').click();
      await expect(page.getByRole('heading', { level: 1 })).not.toHaveText(
        `Gallery Test Piece ${suffix}`
      );

      const hero = page.locator('main img').first();
      await expect(hero).toBeVisible();

      /* An <img> with no src is still "visible" and still occupies its box, so
         the load state is the only thing worth asserting. */
      const broken = await hero.evaluate(
        (img) => !img.currentSrc || !img.complete || img.naturalWidth === 0
      );
      expect(broken, 'the main product image did not load after navigating').toBe(false);
    } finally {
      // Never leave a test piece in the shop, whatever happened above.
      await request.delete(`/api/products/${product._id}`, { headers: auth });
    }
  });
});
