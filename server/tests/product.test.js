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
