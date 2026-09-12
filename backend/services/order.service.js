import Payout from '../models/Payout.js';
import Product from '../models/Product.js';
import Store from '../models/Store.js';
import { round2 } from '../utils/money.js';

export async function finalizePaidOrder(order, { paymentIntentId, chargeId = '' } = {}) {
  if (order.paymentStatus === 'paid') return order;

  order.paymentStatus = 'paid';
  order.paidAt = order.paidAt || new Date();
  order.paymentError = '';
  if (paymentIntentId) order.stripePaymentIntentId = paymentIntentId;
  if (chargeId) order.stripeChargeId = chargeId;

  let refundDue = 0;

  if (!order.inventoryApplied) {
    for (const item of order.items) {
      const updated = await Product.findOneAndUpdate(
        { _id: item.product, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity, unitsSold: item.quantity } },
        { new: true }
      );

      if (!updated) {
        item.fulfillmentStatus = 'cancelled';
        item.restocked = true;
        refundDue = round2(refundDue + item.subtotal);
      }
    }
    order.inventoryApplied = true;
  }

  const fulfillable = order.items.filter((item) => item.fulfillmentStatus !== 'cancelled');

  if (fulfillable.length === 0) {
    order.orderStatus = 'cancelled';
    order.cancelledAt = new Date();
    order.notes = 'Every item sold out before payment completed - a refund is due.';
  } else {
    order.orderStatus = 'processing';
    if (refundDue > 0) {
      order.notes = `${refundDue.toFixed(2)} refund due: some items sold out before capture.`;
    }
  }

  order.statusHistory.push({
    status: order.orderStatus,
    note: 'Payment received',
    at: new Date(),
  });

  await order.save();
  await recordPayouts(order);
  return order;
}

export async function recordPayouts(order) {
  const byVendor = new Map();

  for (const item of order.items) {
    if (item.fulfillmentStatus === 'cancelled') continue;
    const key = String(item.vendor);
    const entry = byVendor.get(key) || {
      vendor: item.vendor,
      vendorUser: item.vendorUser,
      grossSales: 0,
      platformFee: 0,
      netEarnings: 0,
    };
    entry.grossSales = round2(entry.grossSales + item.subtotal);
    entry.platformFee = round2(entry.platformFee + item.platformFee);
    entry.netEarnings = round2(entry.netEarnings + item.vendorEarnings);
    byVendor.set(key, entry);
  }

  await Promise.all(
    [...byVendor.values()].map(async (entry) => {
      await Payout.updateOne(
        { order: order._id, vendor: entry.vendor },
        {
          $setOnInsert: {
            order: order._id,
            orderNumber: order.orderNumber,
            vendor: entry.vendor,
            vendorUser: entry.vendorUser,
            grossSales: entry.grossSales,
            commissionRate: order.commissionRate,
            platformFee: entry.platformFee,
            netEarnings: entry.netEarnings,
            currency: order.currency,
            status: 'pending',
          },
        },
        { upsert: true }
      );
      await Store.updateOne(
        { _id: entry.vendor },
        { $inc: { totalSales: entry.netEarnings, totalOrders: 1 } }
      );
    })
  );
}

export async function markOrderFailed(order, reason = 'Payment was not completed') {
  if (order.paymentStatus === 'paid') return order;
  order.paymentStatus = 'failed';
  order.paymentError = reason;
  order.orderStatus = 'cancelled';
  order.cancelledAt = new Date();
  order.statusHistory.push({ status: 'cancelled', note: reason, at: new Date() });
  await order.save();
  return order;
}

export async function restockOrder(order, lines = order.items) {
  if (!order.inventoryApplied) return;

  const holding = lines.filter((item) => !item.restocked);
  if (holding.length === 0) return;

  await Promise.all(
    holding.map((item) => Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } }))
  );

  await Promise.all(
    holding.map((item) =>
      Product.updateOne(
        { _id: item.product, unitsSold: { $gte: item.quantity } },
        { $inc: { unitsSold: -item.quantity } }
      )
    )
  );

  holding.forEach((item) => {
    item.restocked = true;
  });

  if (order.items.every((item) => item.restocked)) order.inventoryApplied = false;
}

export async function reverseStoreTotals(order) {
  const byVendor = new Map();
  for (const item of order.items) {
    const key = String(item.vendor);
    byVendor.set(key, round2((byVendor.get(key) || 0) + item.vendorEarnings));
  }

  await Promise.all(
    [...byVendor.entries()].map(([vendor, earnings]) =>
      Store.updateOne(
        { _id: vendor },
        { $inc: { totalSales: -earnings, totalOrders: -1 } }
      )
    )
  );
}

export function deriveOrderStatus(order) {
  const active = order.items.filter((item) => item.fulfillmentStatus !== 'cancelled');
  if (active.length === 0) return 'cancelled';
  const rank = { processing: 0, confirmed: 1, shipped: 2, delivered: 3 };
  const lowest = active.reduce(
    (min, item) => Math.min(min, rank[item.fulfillmentStatus] ?? 0),
    Number.POSITIVE_INFINITY
  );
  return ['processing', 'confirmed', 'shipped', 'delivered'][lowest] || 'processing';
}
