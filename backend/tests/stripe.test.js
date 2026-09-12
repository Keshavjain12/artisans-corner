import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import Stripe from 'stripe';

process.env.STRIPE_SECRET_KEY = 'sk_test_audit_dummy_key';
process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_audit_dummy_key';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_audit_dummy_secret';
process.env.ALLOW_MOCK_PAYMENTS = 'false';

const realStripe = new Stripe('sk_test_audit_dummy_key', { apiVersion: '2024-12-18.acacia' });

const stripeState = {
  createdIntents: [],
  retrieveStatus: 'succeeded',
  nextIntentId: 'pi_test_00000000000001',
};

const stripeMock = {
  paymentIntents: {
    create: jest.fn(async (params) => {
      stripeState.createdIntents.push(params);
      return {
        id: stripeState.nextIntentId,
        client_secret: `${stripeState.nextIntentId}_secret_abc`,
        status: 'requires_payment_method',
      };
    }),
    retrieve: jest.fn(async (id) => ({
      id,
      status: stripeState.retrieveStatus,
      latest_charge: 'ch_test_0001',
      last_payment_error: stripeState.retrieveStatus === 'canceled' ? { message: 'Card declined' } : null,
    })),
  },
  webhooks: {
    constructEvent: (payload, signature, secret) =>
      realStripe.webhooks.constructEvent(payload, signature, secret),
  },
};

jest.unstable_mockModule('../config/stripe.js', () => ({ default: stripeMock }));

const { startTestDb, stopTestDb, resetDb, api, registerBuyer, registerVendor, createProduct, Product } =
  await import('./helpers.js');
const { default: Order } = await import('../models/Order.js');
const { default: Payout } = await import('../models/Payout.js');

beforeAll(startTestDb, 120000);
afterAll(stopTestDb);
beforeEach(async () => {
  await resetDb();
  stripeState.createdIntents = [];
  stripeState.retrieveStatus = 'succeeded';
  stripeState.nextIntentId = `pi_test_${Math.random().toString(36).slice(2, 12)}`;
  jest.clearAllMocks();
});

const SHIPPING = {
  fullName: 'Ava Thompson',
  addressLine1: '14 Rosewood Lane',
  city: 'Brooklyn',
  state: 'New York',
  postalCode: '11215',
  country: 'United States',
  phone: '+1 917 555 0143',
};

async function startCheckout({ price = 100, stock = 5, quantity = 2 } = {}) {
  const vendor = await registerVendor('Stripe Test Studio');
  const product = await createProduct(vendor.token, { price, stock });
  const buyer = await registerBuyer();

  const res = await api()
    .post('/api/payments/create-intent')
    .set('Authorization', `Bearer ${buyer.token}`)
    .send({ items: [{ productId: product._id, quantity }], shippingAddress: SHIPPING });

  return { vendor, product, buyer, res };
}

function signedWebhook(event) {
  const payload = JSON.stringify(event);
  const header = realStripe.webhooks.generateTestHeaderString({
    payload,
    secret: process.env.STRIPE_WEBHOOK_SECRET,
  });
  return { payload, header };
}

describe('creating a Stripe PaymentIntent', () => {
  it('charges the server-computed total in minor units', async () => {
    const { res } = await startCheckout({ price: 100, quantity: 2 });

    expect(res.status).toBe(201);
    expect(stripeMock.paymentIntents.create).toHaveBeenCalledTimes(1);

    const params = stripeState.createdIntents[0];
    expect(params.amount).toBe(20000);
    expect(params.currency).toBe('usd');
    expect(res.body.data.totals.total).toBe(200);
  });

  it('ignores a price supplied by the browser', async () => {
    const vendor = await registerVendor('Tamper Studio');
    const product = await createProduct(vendor.token, { price: 100, stock: 5 });
    const buyer = await registerBuyer();

    await api()
      .post('/api/payments/create-intent')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({
        items: [{ productId: product._id, quantity: 1, price: 1 }],
        shippingAddress: SHIPPING,
        total: 1,
      });

    expect(stripeState.createdIntents[0].amount).toBe(10000);
  });

  it('tags the intent so a webhook can find the order', async () => {
    const { res } = await startCheckout();
    const params = stripeState.createdIntents[0];

    expect(params.metadata.orderId).toBe(String(res.body.data.orderId));
    expect(params.metadata.orderNumber).toBe(res.body.data.orderNumber);
  });

  it('returns the client secret and publishable key, never the secret key', async () => {
    const { res } = await startCheckout();

    expect(res.body.data.provider).toBe('stripe');
    expect(res.body.data.clientSecret).toMatch(/_secret_/);
    expect(res.body.data.publishableKey).toBe('pk_test_audit_dummy_key');
    expect(JSON.stringify(res.body)).not.toContain('sk_test');
  });

  it('leaves the order unpaid until payment actually succeeds', async () => {
    const { res, product } = await startCheckout();

    const order = await Order.findById(res.body.data.orderId);
    expect(order.paymentStatus).toBe('pending');
    expect(order.orderStatus).toBe('pending_payment');
    expect(order.stripePaymentIntentId).toBe(stripeState.nextIntentId);

    expect((await Product.findById(product._id)).stock).toBe(5);
  });

  it('refuses to price a basket that exceeds stock before reaching Stripe', async () => {
    const vendor = await registerVendor('Stock Guard Studio');
    const product = await createProduct(vendor.token, { price: 50, stock: 1 });
    const buyer = await registerBuyer();

    const res = await api()
      .post('/api/payments/create-intent')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ items: [{ productId: product._id, quantity: 5 }], shippingAddress: SHIPPING });

    expect(res.status).toBe(400);
    expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
  });
});

describe('confirming a Stripe payment', () => {
  it('re-reads the intent from Stripe rather than trusting the browser', async () => {
    const { res, buyer, product } = await startCheckout();
    stripeState.retrieveStatus = 'succeeded';

    const confirm = await api()
      .post('/api/payments/confirm')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ paymentIntentId: res.body.data.clientSecret.split('_secret_')[0] });

    expect(stripeMock.paymentIntents.retrieve).toHaveBeenCalledTimes(1);
    expect(confirm.status).toBe(200);
    expect(confirm.body.data.order.paymentStatus).toBe('paid');
    expect((await Product.findById(product._id)).stock).toBe(3);
  });

  it('does not pay the order when Stripe says the card was declined', async () => {
    const { res, buyer, product } = await startCheckout();
    stripeState.retrieveStatus = 'requires_payment_method';

    const confirm = await api()
      .post('/api/payments/confirm')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ paymentIntentId: stripeState.nextIntentId });

    expect(confirm.status).toBe(400);

    const order = await Order.findById(res.body.data.orderId);
    expect(order.paymentStatus).toBe('failed');
    expect(order.orderStatus).toBe('cancelled');
    expect((await Product.findById(product._id)).stock).toBe(5);
    expect(await Payout.countDocuments({ order: order._id })).toBe(0);
  });

  it('holds the order open while Stripe is still processing', async () => {
    const { res, buyer } = await startCheckout();
    stripeState.retrieveStatus = 'processing';

    const confirm = await api()
      .post('/api/payments/confirm')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ paymentIntentId: stripeState.nextIntentId });

    expect(confirm.status).toBe(200);
    expect(confirm.body.data.pending).toBe(true);
    expect((await Order.findById(res.body.data.orderId)).paymentStatus).toBe('pending');
  });

  it('rejects simulated payments when Stripe is configured', async () => {
    const { buyer } = await startCheckout();

    const confirm = await api()
      .post('/api/payments/confirm')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ paymentIntentId: 'mock_pi_000000000000000000000000' });

    expect(confirm.status).toBe(404);
  });
});

describe('webhook signature verification', () => {
  const succeededEvent = (intentId) => ({
    id: 'evt_test_1',
    type: 'payment_intent.succeeded',
    data: { object: { id: intentId, latest_charge: 'ch_test_0001' } },
  });

  it('accepts an authentically signed event and finalises the order', async () => {
    const { res, product, vendor } = await startCheckout();
    const intentId = stripeState.nextIntentId;
    const { payload, header } = signedWebhook(succeededEvent(intentId));

    const hook = await api()
      .post('/api/payments/webhook')
      .set('stripe-signature', header)
      .set('Content-Type', 'application/json')
      .send(payload);

    expect(hook.status).toBe(200);
    expect(hook.body.received).toBe(true);

    const order = await Order.findById(res.body.data.orderId);
    expect(order.paymentStatus).toBe('paid');
    expect(order.orderStatus).toBe('processing');
    expect((await Product.findById(product._id)).stock).toBe(3);

    const payout = await Payout.findOne({ order: order._id });
    expect(payout.netEarnings).toBe(190);
    expect(payout.platformFee).toBe(10);
    expect(String(payout.vendor)).toBe(String(vendor.store.id || vendor.store._id));
  });

  it('rejects a forged signature and leaves the order untouched', async () => {
    const { res, product } = await startCheckout();
    const { payload } = signedWebhook(succeededEvent(stripeState.nextIntentId));

    const hook = await api()
      .post('/api/payments/webhook')
      .set('stripe-signature', 't=1,v1=deadbeefdeadbeefdeadbeefdeadbeef')
      .set('Content-Type', 'application/json')
      .send(payload);

    expect(hook.status).toBe(400);
    expect((await Order.findById(res.body.data.orderId)).paymentStatus).toBe('pending');
    expect((await Product.findById(product._id)).stock).toBe(5);
  });

  it('rejects a payload tampered with after signing', async () => {
    const { res } = await startCheckout();
    const { payload, header } = signedWebhook(succeededEvent(stripeState.nextIntentId));
    const tampered = payload.replace('payment_intent.succeeded', 'payment_intent.succeeded ');

    const hook = await api()
      .post('/api/payments/webhook')
      .set('stripe-signature', header)
      .set('Content-Type', 'application/json')
      .send(tampered);

    expect(hook.status).toBe(400);
    expect((await Order.findById(res.body.data.orderId)).paymentStatus).toBe('pending');
  });

  it('rejects an unsigned request', async () => {
    await startCheckout();
    const { payload } = signedWebhook(succeededEvent(stripeState.nextIntentId));

    const hook = await api()
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .send(payload);

    expect(hook.status).toBe(400);
  });

  it('marks the order failed on payment_intent.payment_failed', async () => {
    const { res, product } = await startCheckout();
    const { payload, header } = signedWebhook({
      id: 'evt_test_2',
      type: 'payment_intent.payment_failed',
      data: {
        object: {
          id: stripeState.nextIntentId,
          last_payment_error: { message: 'Your card was declined.' },
        },
      },
    });

    await api()
      .post('/api/payments/webhook')
      .set('stripe-signature', header)
      .set('Content-Type', 'application/json')
      .send(payload);

    const order = await Order.findById(res.body.data.orderId);
    expect(order.paymentStatus).toBe('failed');
    expect(order.paymentError).toBe('Your card was declined.');
    expect((await Product.findById(product._id)).stock).toBe(5);
  });

  it('is idempotent across the webhook and the browser confirmation', async () => {
    const { res, buyer, product } = await startCheckout();
    const intentId = stripeState.nextIntentId;
    const { payload, header } = signedWebhook(succeededEvent(intentId));

    await api()
      .post('/api/payments/webhook')
      .set('stripe-signature', header)
      .set('Content-Type', 'application/json')
      .send(payload);

    await api()
      .post('/api/payments/confirm')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ paymentIntentId: intentId });

    await api()
      .post('/api/payments/webhook')
      .set('stripe-signature', header)
      .set('Content-Type', 'application/json')
      .send(payload);

    expect((await Product.findById(product._id)).stock).toBe(3);
    expect(await Payout.countDocuments({ order: res.body.data.orderId })).toBe(1);
  });

  it('ignores an event for an order it does not know', async () => {
    const { payload, header } = signedWebhook(succeededEvent('pi_test_unknown_intent'));

    const hook = await api()
      .post('/api/payments/webhook')
      .set('stripe-signature', header)
      .set('Content-Type', 'application/json')
      .send(payload);

    expect(hook.status).toBe(200);
  });
});
