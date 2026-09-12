import Order from '../models/Order.js';
import Payout from '../models/Payout.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import sendSuccess from '../utils/apiResponse.js';
import { round2 } from '../utils/money.js';
import { buildMeta, getPagination } from '../utils/pagination.js';
import {
  deriveOrderStatus,
  restockOrder,
  reverseStoreTotals,
} from '../services/order.service.js';

function projectForVendor(order, storeId) {
  const items = order.items.filter((item) => String(item.vendor) === String(storeId));
  const subtotal = round2(items.reduce((sum, item) => sum + item.subtotal, 0));
  const platformFee = round2(items.reduce((sum, item) => sum + item.platformFee, 0));
  const vendorEarnings = round2(items.reduce((sum, item) => sum + item.vendorEarnings, 0));

  return {
    id: order._id,
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    shippingAddress: order.shippingAddress,
    buyer: order.buyer?.name ? { name: order.buyer.name, email: order.buyer.email } : null,
    currency: order.currency,
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    vendorTotals: { subtotal, platformFee, vendorEarnings, commissionRate: order.commissionRate },
  };
}

export const getMyOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 10, maxLimit: 50 });
  const filter = { buyer: req.user._id, paymentStatus: { $ne: 'pending' } };
  if (req.query.status) filter.orderStatus = req.query.status;

  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Order.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    message: 'Your orders',
    data: orders,
    meta: buildMeta({ page, limit, total }),
  });
});

export const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('buyer', 'name email');
  if (!order) throw ApiError.notFound('Order not found');

  const isBuyer = String(order.buyer?._id || order.buyer) === String(req.user._id);
  const isAdmin = req.user.role === 'admin';
  const vendorStoreId = req.user.store ? String(req.user.store) : null;
  const isVendorOnOrder =
    vendorStoreId && order.vendors.some((vendor) => String(vendor) === vendorStoreId);

  if (!isBuyer && !isAdmin && !isVendorOnOrder) {
    throw ApiError.forbidden('This order belongs to someone else');
  }

  if (!isBuyer && !isAdmin) {
    return sendSuccess(res, {
      message: order.orderNumber,
      data: { order: projectForVendor(order, vendorStoreId), scope: 'vendor' },
    });
  }

  return sendSuccess(res, {
    message: order.orderNumber,
    data: { order, scope: isBuyer ? 'buyer' : 'admin' },
  });
});

export const getVendorOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 10, maxLimit: 50 });
  const filter = { vendors: req.store._id, paymentStatus: 'paid' };
  if (req.query.status) filter['items.fulfillmentStatus'] = req.query.status;

  const [orders, total] = await Promise.all([
    Order.find(filter).populate('buyer', 'name email').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    message: 'Store orders',
    data: orders.map((order) => projectForVendor(order, req.store._id)),
    meta: buildMeta({ page, limit, total }),
  });
});

export const updateFulfilmentStatus = asyncHandler(async (req, res) => {
  const { status, trackingNumber, itemIds } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found');
  if (order.paymentStatus !== 'paid') throw ApiError.badRequest('That order has not been paid');

  const isAdmin = req.user.role === 'admin';
  const storeId = String(req.store?._id || '');
  const ownItems = order.items.filter((item) => isAdmin || String(item.vendor) === storeId);
  if (ownItems.length === 0) throw ApiError.forbidden('No items in this order belong to your shop');

  const targets = itemIds?.length
    ? ownItems.filter((item) => itemIds.includes(String(item._id)))
    : ownItems;
  if (targets.length === 0) throw ApiError.badRequest('No matching items to update');

  for (const item of targets) {
    if (item.fulfillmentStatus === 'delivered' && status !== 'delivered' && !isAdmin) {
      throw ApiError.badRequest('Delivered items cannot be moved back');
    }
    item.fulfillmentStatus = status;
    if (trackingNumber) item.trackingNumber = trackingNumber;
  }

  if (status === 'cancelled') await restockOrder(order, targets);

  order.orderStatus = deriveOrderStatus(order);
  order.statusHistory.push({
    status,
    note: `${targets.length} item(s) marked ${status}`,
    at: new Date(),
  });
  await order.save();

  return sendSuccess(res, {
    message: `Order marked ${status}`,
    data: { order: projectForVendor(order, storeId || order.vendors[0]) },
  });
});

export const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found');

  const isAdmin = req.user.role === 'admin';
  if (String(order.buyer) !== String(req.user._id) && !isAdmin) {
    throw ApiError.forbidden('This order belongs to someone else');
  }
  if (order.orderStatus === 'cancelled') {
    throw ApiError.badRequest('That order is already cancelled');
  }
  if (['shipped', 'delivered'].includes(order.orderStatus) && !isAdmin) {
    throw ApiError.badRequest('This order has already shipped - please contact the seller');
  }

  await restockOrder(order);
  order.items.forEach((item) => {
    item.fulfillmentStatus = 'cancelled';
  });
  order.orderStatus = 'cancelled';
  order.cancelledAt = new Date();
  order.statusHistory.push({
    status: 'cancelled',
    note: isAdmin ? 'Cancelled by an admin' : 'Cancelled by buyer',
    at: new Date(),
  });
  await order.save();
  await Payout.updateMany({ order: order._id }, { status: 'reversed' });
  if (order.paymentStatus === 'paid') await reverseStoreTotals(order);

  return sendSuccess(res, { message: 'Order cancelled', data: { order } });
});

export const getVendorPayouts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 20, maxLimit: 100 });
  const filter = { vendor: req.store._id };

  const [payouts, total, summaryRows] = await Promise.all([
    Payout.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Payout.countDocuments(filter),
    Payout.aggregate([
      { $match: { vendor: req.store._id, status: { $ne: 'reversed' } } },
      {
        $group: {
          _id: null,
          gross: { $sum: '$grossSales' },
          fees: { $sum: '$platformFee' },
          net: { $sum: '$netEarnings' },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$netEarnings', 0] } },
        },
      },
    ]),
  ]);

  const summary = summaryRows[0];
  return sendSuccess(res, {
    message: 'Earnings',
    data: {
      payouts,
      summary: {
        grossSales: round2(summary?.gross || 0),
        platformFees: round2(summary?.fees || 0),
        netEarnings: round2(summary?.net || 0),
        pendingPayout: round2(summary?.pending || 0),
      },
    },
    meta: buildMeta({ page, limit, total }),
  });
});
