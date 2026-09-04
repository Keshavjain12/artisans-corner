import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import {
  Product,
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

/** Runs a full simulated purchase and returns the resulting paid order. */
async function purchase(buyerToken, productId, quantity = 1) {
  const intent = await api()
    .post('/api/payments/create-intent')
    .set('Authorization', `Bearer ${buyerToken}`)
    .send({ items: [{ productId, quantity }], shippingAddress: SHIPPING });

  const confirmed = await api()
    .post('/api/payments/confirm')
    .set('Authorization', `Bearer ${buyerToken}`)
    .send({ paymentIntentId: intent.body.data.paymentIntentId });

  return confirmed;
}

describe('paid order lifecycle', () => {
  it('creates the order, decrements stock and records the payout', async () => {
    const vendor = await registerVendor('Order Studio');
    const product = await createProduct(vendor.token, { price: 100, stock: 5 });
    const buyer = await registerBuyer();

    const res = await purchase(buyer.token, product._id, 2);
    expect(res.status).toBe(200);
    expect(res.body.data.order.paymentStatus).toBe('paid');
    expect(res.body.data.order.orderStatus).toBe('processing');

    const updated = await Product.findById(product._id);
    expect(updated.stock).toBe(3);
    expect(updated.unitsSold).toBe(2);

    const payouts = await api()
      .get('/api/vendors/me/payouts')
      .set('Authorization', `Bearer ${vendor.token}`);
    expect(payouts.body.data.summary).toMatchObject({
      grossSales: 200,
      platformFees: 10,
      netEarnings: 190,
    });
  });

  it('is idempotent - confirming twice does not double-decrement stock', async () => {
    const vendor = await registerVendor('Idempotent Studio');
    const product = await createProduct(vendor.token, { price: 50, stock: 4 });
    const buyer = await registerBuyer();

    const intent = await api()
      .post('/api/payments/create-intent')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ items: [{ productId: product._id, quantity: 1 }], shippingAddress: SHIPPING });

    const id = intent.body.data.paymentIntentId;
    await api()
      .post('/api/payments/confirm')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ paymentIntentId: id });
    await api()
      .post('/api/payments/confirm')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ paymentIntentId: id });

    const updated = await Product.findById(product._id);
    expect(updated.stock).toBe(3);
  });

  it('keeps the price snapshot when the product price later changes', async () => {
    const vendor = await registerVendor('Snapshot Studio');
    const product = await createProduct(vendor.token, { price: 100, stock: 5 });
    const buyer = await registerBuyer();

    await purchase(buyer.token, product._id, 1);
    await api()
      .put(`/api/products/${product._id}`)
      .set('Authorization', `Bearer ${vendor.token}`)
      .send({ price: 250 });

    const orders = await api()
      .get('/api/orders/my-orders')
      .set('Authorization', `Bearer ${buyer.token}`);
    expect(orders.body.data[0].items[0].priceSnapshot).toBe(100);
    expect(orders.body.data[0].total).toBe(100);
  });

  it('does not expose another buyer order', async () => {
    const vendor = await registerVendor('Privacy Studio');
    const product = await createProduct(vendor.token, { price: 100, stock: 5 });
    const buyer = await registerBuyer();
    const stranger = await registerBuyer();

    const res = await purchase(buyer.token, product._id, 1);
    const orderId = res.body.data.order._id;

    const denied = await api()
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${stranger.token}`);
    expect(denied.status).toBe(403);
  });
});

describe('verified reviews', () => {
  it('rejects a review from someone who never bought the product', async () => {
    const vendor = await registerVendor('Review Studio');
    const product = await createProduct(vendor.token, { price: 40, stock: 5 });
    const stranger = await registerBuyer();

    const res = await api()
      .post('/api/reviews')
      .set('Authorization', `Bearer ${stranger.token}`)
      .send({ productId: product._id, rating: 5, comment: 'Never actually bought this one.' });

    expect(res.status).toBe(403);
  });

  it('accepts a review from a verified buyer and updates the average', async () => {
    const vendor = await registerVendor('Verified Studio');
    const product = await createProduct(vendor.token, { price: 40, stock: 5 });
    const buyer = await registerBuyer();
    await purchase(buyer.token, product._id, 1);

    const res = await api()
      .post('/api/reviews')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ productId: product._id, rating: 4, comment: 'Beautifully finished, arrived quickly.' });

    expect(res.status).toBe(201);
    expect(res.body.data.ratingAverage).toBe(4);
    expect(res.body.data.reviewCount).toBe(1);

    const duplicate = await api()
      .post('/api/reviews')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ productId: product._id, rating: 1, comment: 'Trying to review this a second time.' });
    expect(duplicate.status).toBe(409);
  });

  it('validates the rating range', async () => {
    const vendor = await registerVendor('Rating Studio');
    const product = await createProduct(vendor.token, { price: 40, stock: 5 });
    const buyer = await registerBuyer();
    await purchase(buyer.token, product._id, 1);

    const res = await api()
      .post('/api/reviews')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ productId: product._id, rating: 9, comment: 'Out of range rating attempt.' });

    expect(res.status).toBe(400);
  });
});
