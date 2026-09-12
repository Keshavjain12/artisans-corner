import Order from '../models/Order.js';
import Payout from '../models/Payout.js';
import Product from '../models/Product.js';
import Store from '../models/Store.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import sendSuccess from '../utils/apiResponse.js';
import { round2 } from '../utils/money.js';
import { buildMeta, getPagination } from '../utils/pagination.js';
import { searchRegex } from '../utils/search.js';

export const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 20, maxLimit: 100 });
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.status === 'active') filter.isActive = true;
  if (req.query.status === 'inactive') filter.isActive = false;
  const rx = searchRegex(req.query.q);
  if (rx) filter.$or = [{ name: rx }, { email: rx }];

  const [users, total] = await Promise.all([
    User.find(filter).populate('store', 'name slug').sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    message: 'Users',
    data: users,
    meta: buildMeta({ page, limit, total }),
  });
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  if (String(user._id) === String(req.user._id)) {
    throw ApiError.badRequest('You cannot change your own admin account here');
  }

  if (req.body.isActive !== undefined) user.isActive = req.body.isActive;
  if (req.body.role) {
    if (req.body.role === 'vendor' && !user.store) {
      throw ApiError.badRequest('That user has not created a store yet');
    }
    user.role = req.body.role;
  }
  await user.save();

  return sendSuccess(res, { message: 'User updated', data: { user } });
});

export const listStores = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 20, maxLimit: 100 });
  const filter = {};
  if (req.query.status === 'active') filter.isActive = true;
  if (req.query.status === 'suspended') filter.isActive = false;
  const rx = searchRegex(req.query.q);
  if (rx) filter.name = rx;

  const [stores, total] = await Promise.all([
    Store.find(filter).populate('owner', 'name email').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Store.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    message: 'Stores',
    data: stores,
    meta: buildMeta({ page, limit, total }),
  });
});

export const moderateStore = asyncHandler(async (req, res) => {
  const store = await Store.findById(req.params.id);
  if (!store) throw ApiError.notFound('Store not found');

  store.isActive = req.body.isActive;
  store.suspendedReason = req.body.isActive ? '' : req.body.reason || 'Suspended by an admin';
  await store.save();

  return sendSuccess(res, {
    message: store.isActive ? 'Store reinstated' : 'Store suspended',
    data: { store },
  });
});

export const listProducts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 20, maxLimit: 100 });
  const filter = {};
  if (req.query.status === 'active') Object.assign(filter, { isActive: true, isArchived: false });
  if (req.query.status === 'hidden') filter.isActive = false;
  if (req.query.status === 'archived') filter.isArchived = true;
  if (req.query.category) filter.category = String(req.query.category).toLowerCase();
  const rx = searchRegex(req.query.q);
  if (rx) filter.name = rx;

  const [products, total] = await Promise.all([
    Product.find(filter).populate('vendor', 'name slug').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Product.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    message: 'Products',
    data: products,
    meta: buildMeta({ page, limit, total }),
  });
});

export const moderateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound('Product not found');

  product.isActive = req.body.isActive;
  await product.save();

  return sendSuccess(res, {
    message: product.isActive ? 'Product published' : 'Product hidden from the marketplace',
    data: { product },
  });
});

export const listOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 20, maxLimit: 100 });
  const filter = { paymentStatus: { $ne: 'pending' } };
  if (req.query.status) filter.orderStatus = req.query.status;
  if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;
  const rx = searchRegex(req.query.q);
  if (rx) filter.orderNumber = rx;

  const [orders, total] = await Promise.all([
    Order.find(filter).populate('buyer', 'name email').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    message: 'Orders',
    data: orders,
    meta: buildMeta({ page, limit, total }),
  });
});

export const getRevenueReport = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 20, maxLimit: 100 });

  const [payouts, total, totalsRows, byVendor] = await Promise.all([
    Payout.find({})
      .populate('vendor', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Payout.countDocuments({}),
    Payout.aggregate([
      { $match: { status: { $ne: 'reversed' } } },
      {
        $group: {
          _id: null,
          gross: { $sum: '$grossSales' },
          fees: { $sum: '$platformFee' },
          net: { $sum: '$netEarnings' },
          owed: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$netEarnings', 0] } },
        },
      },
    ]),
    Payout.aggregate([
      { $match: { status: { $ne: 'reversed' } } },
      {
        $group: {
          _id: '$vendor',
          gross: { $sum: '$grossSales' },
          fees: { $sum: '$platformFee' },
          net: { $sum: '$netEarnings' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { gross: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'stores', localField: '_id', foreignField: '_id', as: 'store' } },
      { $unwind: { path: '$store', preserveNullAndEmptyArrays: true } },
    ]),
  ]);

  const totals = totalsRows[0];
  return sendSuccess(res, {
    message: 'Revenue report',
    data: {
      payouts,
      summary: {
        grossMerchandiseValue: round2(totals?.gross || 0),
        platformRevenue: round2(totals?.fees || 0),
        vendorEarnings: round2(totals?.net || 0),
        outstandingPayouts: round2(totals?.owed || 0),
      },
      byVendor: byVendor.map((row) => ({
        storeId: row._id,
        name: row.store?.name || 'Unknown shop',
        slug: row.store?.slug || '',
        grossSales: round2(row.gross),
        platformFees: round2(row.fees),
        netEarnings: round2(row.net),
        orders: row.orders,
      })),
    },
    meta: buildMeta({ page, limit, total }),
  });
});

export const settlePayout = asyncHandler(async (req, res) => {
  const payout = await Payout.findById(req.params.id);
  if (!payout) throw ApiError.notFound('Payout not found');
  if (payout.status === 'paid') throw ApiError.badRequest('That payout is already settled');

  payout.status = 'paid';
  payout.settledAt = new Date();
  await payout.save();

  return sendSuccess(res, { message: 'Payout marked as settled', data: { payout } });
});
