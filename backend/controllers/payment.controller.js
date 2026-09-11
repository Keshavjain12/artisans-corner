import env from '../config/env.js';
import stripe from '../config/stripe.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import sendSuccess from '../utils/apiResponse.js';
import { toMinorUnits } from '../utils/money.js';
import { buildCheckoutQuote } from '../services/pricing.service.js';
import { finalizePaidOrder, markOrderFailed } from '../services/order.service.js';

const MOCK_PREFIX = 'mock_pi_';

/** Read-only pricing preview: the cart page shows exactly what will be charged. */
export const getQuote = asyncHandler(async (req, res) => {
  const quote = await buildCheckoutQuote(req.body.items);
  return sendSuccess(res, {
    message: 'Checkout quote',
    data: {
      totals: quote.totals,
      lines: quote.lineItems.map((line) => ({
        product: line.product,
        name: line.productNameSnapshot,
        vendor: line.vendorNameSnapshot,
        unitPrice: line.priceSnapshot,
        quantity: line.quantity,
        subtotal: line.subtotal,
      })),
    },
  });
});

/**
 * Step 1 of payment: the server prices the basket from the database, writes a
 * pending order and asks Stripe for a PaymentIntent. Nothing the browser sent
 * about money is used.
 */
export const createPaymentIntent = asyncHandler(async (req, res) => {
  const { items, shippingAddress, saveAddress } = req.body;

  // Drop this buyer's abandoned checkouts so history stays clean.
  await Order.deleteMany({
    buyer: req.user._id,
    paymentStatus: 'pending',
    createdAt: { $lt: new Date(Date.now() - 30 * 60 * 1000) },
  });

  const quote = await buildCheckoutQuote(items);
  const { totals } = quote;

  const order = await Order.create({
    buyer: req.user._id,
    items: quote.lineItems,
    vendors: quote.vendors,
    shippingAddress,
    subtotal: totals.subtotal,
    shippingCost: totals.shippingCost,
    tax: totals.tax,
    total: totals.total,
    currency: totals.currency,
    commissionRate: totals.commissionRate,
    platformFee: totals.platformFee,
    vendorEarnings: totals.vendorEarnings,
    paymentStatus: 'pending',
    orderStatus: 'pending_payment',
    statusHistory: [{ status: 'pending_payment', note: 'Checkout started' }],
  });

  if (saveAddress) {
    await User.findByIdAndUpdate(req.user._id, { defaultShippingAddress: shippingAddress });
  }

  if (env.stripeEnabled) {
    const intent = await stripe.paymentIntents.create({
      amount: toMinorUnits(totals.total),
      currency: totals.currency,
      automatic_payment_methods: { enabled: true },
      description: `Artisan's Corner order ${order.orderNumber}`,
      metadata: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        buyerId: req.user._id.toString(),
      },
      receipt_email: req.user.email,
    });

    order.stripePaymentIntentId = intent.id;
    order.paymentProvider = 'stripe';
    await order.save();

    return sendSuccess(res, {
      statusCode: 201,
      message: 'Payment intent created',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        clientSecret: intent.client_secret,
        publishableKey: env.stripe.publishableKey,
        provider: 'stripe',
        totals,
      },
    });
  }

  if (!env.allowMockPayments) {
    throw new ApiError(503, 'Payments are not configured on this server yet');
  }

  // Development-only path so the marketplace stays demo-able without keys.
  order.paymentProvider = 'mock';
  order.stripePaymentIntentId = `${MOCK_PREFIX}${order._id}`;
  await order.save();

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Simulated payment intent created (development mode)',
    data: {
      orderId: order._id,
      orderNumber: order.orderNumber,
      clientSecret: null,
      paymentIntentId: order.stripePaymentIntentId,
      provider: 'mock',
      totals,
    },
  });
});

/**
 * Step 2: the browser reports back after Stripe.js finishes. We never trust
 * that report - the intent is re-read from Stripe before the order is paid.
 */
export const confirmPayment = asyncHandler(async (req, res) => {
  const { paymentIntentId } = req.body;

  const order = await Order.findOne({
    stripePaymentIntentId: paymentIntentId,
    buyer: req.user._id,
  });
  if (!order) throw ApiError.notFound('We could not find that checkout');

  if (order.paymentStatus === 'paid') {
    return sendSuccess(res, { message: 'Order already confirmed', data: { order } });
  }

  if (order.paymentProvider === 'mock') {
    if (!env.allowMockPayments) throw ApiError.forbidden('Simulated payments are disabled');
    await finalizePaidOrder(order, { paymentIntentId });
    return sendSuccess(res, { message: 'Payment complete (simulated)', data: { order } });
  }

  const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (intent.status === 'succeeded') {
    await finalizePaidOrder(order, {
      paymentIntentId: intent.id,
      chargeId: intent.latest_charge || '',
    });
    return sendSuccess(res, { message: 'Payment received', data: { order } });
  }

  if (['requires_payment_method', 'canceled'].includes(intent.status)) {
    await markOrderFailed(order, 'The payment was declined or cancelled');
    throw ApiError.badRequest('That payment did not go through. Please try another card.');
  }

  return sendSuccess(res, {
    message: 'Payment is still processing',
    data: { order, pending: true },
  });
});

/**
 * Stripe's own notification. Signature-verified and idempotent, this is the
 * authoritative confirmation - the client call above is only a fast path.
 */
export const handleWebhook = asyncHandler(async (req, res) => {
  if (!env.stripeEnabled || !env.stripe.webhookSecret) {
    throw new ApiError(503, 'Stripe webhooks are not configured');
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      env.stripe.webhookSecret
    );
  } catch (error) {
    throw ApiError.badRequest(`Webhook signature verification failed: ${error.message}`);
  }

  const intent = event.data.object;
  const order = await Order.findOne({ stripePaymentIntentId: intent.id });

  if (order) {
    if (event.type === 'payment_intent.succeeded') {
      await finalizePaidOrder(order, {
        paymentIntentId: intent.id,
        chargeId: intent.latest_charge || '',
      });
    } else if (event.type === 'payment_intent.payment_failed') {
      await markOrderFailed(order, intent.last_payment_error?.message || 'Payment failed');
    }
  }

  // Always 200 so Stripe stops retrying events we have handled or ignore.
  return res.json({ received: true });
});

export const getPaymentConfig = asyncHandler(async (_req, res) =>
  sendSuccess(res, {
    message: 'Payment configuration',
    data: {
      provider: env.stripeEnabled ? 'stripe' : env.allowMockPayments ? 'mock' : 'disabled',
      // Lets the client label a public demo, rather than every local dev run.
      demo: env.demoDeployment && !env.stripeEnabled,
      publishableKey: env.stripe.publishableKey,
      currency: env.currency,
      commissionRate: env.commissionRate,
      shippingFlatRate: env.shippingFlatRate,
      freeShippingThreshold: env.freeShippingThreshold,
      taxRate: env.taxRate,
    },
  })
);
