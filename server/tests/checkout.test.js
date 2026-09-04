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

const SHIPPING = {
  fullName: 'Ava Thompson',
  addressLine1: '14 Rosewood Lane',
  city: 'Brooklyn',
  state: 'New York',
  postalCode: '11215',
  country: 'United States',
  phone: '+1 917 555 0143',
};

async function checkout(buyerToken, items) {
  return api()
    .post('/api/payments/create-intent')
    .set('Authorization', `Bearer ${buyerToken}`)
    .send({ items, shippingAddress: SHIPPING });
}

describe('checkout pricing is computed server-side', () => {
  it('prices the basket from the database and applies 5% commission', async () => {
    const vendor = await registerVendor('Pricing Studio');
    const product = await createProduct(vendor.token, { price: 100, stock: 5 });
    const buyer = await registerBuyer();

    const res = await checkout(buyer.token, [{ productId: product._id, quantity: 2 }]);

    expect(res.status).toBe(201);
    expect(res.body.data.totals).toMatchObject({
      subtotal: 200,
      shippingCost: 0,
      total: 200,
      platformFee: 10,
      vendorEarnings: 190,
      commissionRate: 0.05,
    });
  });

  it('ignores any price the browser tries to send', async () => {
    const vendor = await registerVendor('Tamper Studio');
    const product = await createProduct(vendor.token, { price: 100, stock: 5 });
    const buyer = await registerBuyer();

    const res = await api()
      .post('/api/payments/create-intent')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({
        items: [{ productId: product._id, quantity: 1, price: 1, subtotal: 1 }],
        shippingAddress: SHIPPING,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.totals.subtotal).toBe(100);
  });

  it('adds flat shipping below the free-shipping threshold', async () => {
    const vendor = await registerVendor('Shipping Studio');
    const product = await createProduct(vendor.token, { price: 20, stock: 5 });
    const buyer = await registerBuyer();

    const res = await checkout(buyer.token, [{ productId: product._id, quantity: 1 }]);
    expect(res.body.data.totals.shippingCost).toBe(5);
    expect(res.body.data.totals.total).toBe(25);
  });

  it('refuses to sell more units than are in stock', async () => {
    const vendor = await registerVendor('Stock Studio');
    const product = await createProduct(vendor.token, { price: 30, stock: 2 });
    const buyer = await registerBuyer();

    const res = await checkout(buyer.token, [{ productId: product._id, quantity: 3 }]);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Only 2 left/);
  });

  it('refuses an inactive product', async () => {
    const vendor = await registerVendor('Inactive Studio');
    const product = await createProduct(vendor.token, { price: 30, stock: 2 });
    await api()
      .put(`/api/products/${product._id}`)
      .set('Authorization', `Bearer ${vendor.token}`)
      .send({ isActive: false });
    const buyer = await registerBuyer();

    const res = await checkout(buyer.token, [{ productId: product._id, quantity: 1 }]);
    expect(res.status).toBe(400);
  });

  it('requires authentication', async () => {
    const res = await api()
      .post('/api/payments/create-intent')
      .send({ items: [], shippingAddress: SHIPPING });
    expect(res.status).toBe(401);
  });
});
