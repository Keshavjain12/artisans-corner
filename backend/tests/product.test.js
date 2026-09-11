import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import {
  api,
  createProduct,
  registerBuyer,
  registerVendor,
  resetDb,
  startTestDb,
  stopTestDb,
} from './helpers.js';

beforeAll(startTestDb, 120000);
afterAll(stopTestDb);
beforeEach(resetDb);

describe('product authorization', () => {
  it('refuses product creation for a buyer without a store', async () => {
    const buyer = await registerBuyer();
    const res = await api()
      .post('/api/products')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({
        name: 'Unauthorised Vase',
        description: 'A description long enough to pass validation checks here.',
        price: 40,
        category: 'pottery',
        stock: 2,
      });

    expect(res.status).toBe(403);
  });

  it('lets a vendor create a product owned by their own store', async () => {
    const vendor = await registerVendor('Kiln Test');
    const product = await createProduct(vendor.token, { name: 'Owned Vase' });

    expect(product.name).toBe('Owned Vase');
    expect(String(product.vendor)).toBe(String(vendor.store.id || vendor.store._id));
    expect(product.slug).toBe('owned-vase');
  });

  it('stops vendor A editing vendor B product', async () => {
    const vendorA = await registerVendor('Studio A');
    const vendorB = await registerVendor('Studio B');
    const product = await createProduct(vendorB.token, { name: 'B Product' });

    const res = await api()
      .put(`/api/products/${product._id}`)
      .set('Authorization', `Bearer ${vendorA.token}`)
      .send({ price: 1 });

    expect(res.status).toBe(403);
  });

  it('stops vendor A deleting vendor B product', async () => {
    const vendorA = await registerVendor('Studio C');
    const vendorB = await registerVendor('Studio D');
    const product = await createProduct(vendorB.token, { name: 'Protected Product' });

    const res = await api()
      .delete(`/api/products/${product._id}`)
      .set('Authorization', `Bearer ${vendorA.token}`);

    expect(res.status).toBe(403);
  });

  it('validates price, stock and category', async () => {
    const vendor = await registerVendor('Validation Studio');
    const res = await api()
      .post('/api/products')
      .set('Authorization', `Bearer ${vendor.token}`)
      .send({ name: 'Ba', description: 'too short', price: -5, category: '', stock: -1 });

    expect(res.status).toBe(400);
    const fields = res.body.errors.map((e) => e.field);
    expect(fields).toEqual(
      expect.arrayContaining(['name', 'description', 'price', 'category', 'stock'])
    );
  });

  it('rejects a category outside the marketplace taxonomy', async () => {
    const vendor = await registerVendor('Taxonomy Studio');
    const res = await api()
      .post('/api/products')
      .set('Authorization', `Bearer ${vendor.token}`)
      .send({
        name: 'Mystery Item',
        description: 'A description long enough to pass validation checks here.',
        price: 20,
        category: 'spaceships',
        stock: 1,
      });

    expect(res.status).toBe(400);
  });
});

describe('the images a product may carry', () => {
  /* The seed writes its artwork as root-relative paths, and the vendor form
     resubmits whatever images it loaded - so an absolute-URL-only rule made
     every seeded product unsaveable, price change and all. */
  it('accepts the paths this app actually produces', async () => {
    const vendor = await registerVendor('Path Studio');

    for (const url of [
      'https://res.cloudinary.com/demo/image/upload/v1/products/mug.webp',
      '/product-photos/ash-wood-coffee-scoop.webp',
      '/uploads/9f8e7d6c5b4a.webp',
    ]) {
      const product = await createProduct(vendor.token, {
        name: `Piece ${Math.random().toString(36).slice(2, 7)}`,
        images: [{ url, alt: 'A handmade piece' }],
      });
      expect(product.images[0].url).toBe(url);
    }
  });

  it('lets a vendor edit a product whose image is a seeded relative path', async () => {
    const vendor = await registerVendor('Reprice Studio');
    const product = await createProduct(vendor.token, {
      images: [{ url: '/product-photos/terracotta-planter-set-of-three.webp', alt: 'Planters' }],
    });

    // Exactly what the form sends: the price changed, the images untouched.
    const res = await api()
      .put(`/api/products/${product._id}`)
      .set('Authorization', `Bearer ${vendor.token}`)
      .send({
        price: 42,
        images: product.images.map((image) => ({
          url: image.url,
          publicId: image.publicId || '',
          alt: image.alt || '',
        })),
      });

    expect(res.status).toBe(200);
    expect(res.body.data.product.price).toBe(42);
  });

  it('refuses anything that is not an image on Cloudinary or this origin', async () => {
    const vendor = await registerVendor('Hostile Studio');

    for (const url of [
      '//evil.example.com/steal.png',
      'javascript:alert(document.cookie)',
      'data:image/png;base64,iVBORw0KGgo=',
      '/../../etc/passwd',
      'ftp://host/x.png',
      'not a url at all',
    ]) {
      const res = await api()
        .post('/api/products')
        .set('Authorization', `Bearer ${vendor.token}`)
        .send({
          name: 'Hostile Vase',
          description: 'A description long enough to pass the validation checks here.',
          price: 40,
          category: 'pottery',
          stock: 2,
          images: [{ url }],
        });

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body.errors)).toMatch(/valid URL/);
    }
  });
});

describe('public product listing', () => {
  it('hides products from the marketplace when they are deactivated', async () => {
    const vendor = await registerVendor('Visibility Studio');
    const product = await createProduct(vendor.token, { name: 'Hidden Bowl' });

    await api()
      .put(`/api/products/${product._id}`)
      .set('Authorization', `Bearer ${vendor.token}`)
      .send({ isActive: false });

    const list = await api().get('/api/products?q=Hidden');
    expect(list.body.data).toHaveLength(0);
  });

  it('searches by name and filters by category', async () => {
    const vendor = await registerVendor('Search Studio');
    await createProduct(vendor.token, { name: 'Indigo Scarf', category: 'accessories' });
    await createProduct(vendor.token, { name: 'Oak Bowl', category: 'woodwork' });

    const search = await api().get('/api/products?q=indigo');
    expect(search.body.data).toHaveLength(1);

    const filtered = await api().get('/api/products?category=woodwork');
    expect(filtered.body.data).toHaveLength(1);
    expect(filtered.body.data[0].name).toBe('Oak Bowl');
  });
});
