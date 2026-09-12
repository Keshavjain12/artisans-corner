import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Store from '../models/Store.js';
import User from '../models/User.js';
import { round2 } from '../utils/money.js';

const RANGE_DAYS = { '7d': 7, '30d': 30, '90d': 90, '1y': 365, all: null };

export function resolveRange(range = '30d') {
  const key = Object.keys(RANGE_DAYS).includes(range) ? range : '30d';
  const days = RANGE_DAYS[key];
  const to = new Date();
  const from = days ? new Date(to.getTime() - days * 24 * 60 * 60 * 1000) : new Date(0);
  return { from, to, days, range: key };
}

function toDailySeries(rows, from, to) {
  const byDay = new Map(rows.map((row) => [row._id, row]));
  const series = [];
  const cursor = new Date(from);
  cursor.setUTCHours(0, 0, 0, 0);
  const end = new Date(to);
  const maxPoints = 400;

  while (cursor <= end && series.length < maxPoints) {
    const key = cursor.toISOString().slice(0, 10);
    const row = byDay.get(key);
    series.push({
      date: key,
      revenue: round2(row?.revenue || 0),
      earnings: round2(row?.earnings || 0),
      fees: round2(row?.fees || 0),
      orders: row?.orders?.length || 0,
      units: row?.units || 0,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return series;
}

export async function getVendorAnalytics(storeId, range = '30d') {
  const { from, to } = resolveRange(range);
  const vendor = new mongoose.Types.ObjectId(String(storeId));

  const matchPaidItems = [
    { $match: { paymentStatus: 'paid', vendors: vendor, createdAt: { $gte: from, $lte: to } } },
    { $unwind: '$items' },
    { $match: { 'items.vendor': vendor, 'items.fulfillmentStatus': { $ne: 'cancelled' } } },
  ];

  const [totalsRow] = await Order.aggregate([
    ...matchPaidItems,
    {
      $group: {
        _id: null,
        revenue: { $sum: '$items.subtotal' },
        fees: { $sum: '$items.platformFee' },
        earnings: { $sum: '$items.vendorEarnings' },
        units: { $sum: '$items.quantity' },
        orders: { $addToSet: '$_id' },
      },
    },
  ]);

  const dailyRows = await Order.aggregate([
    ...matchPaidItems,
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenue: { $sum: '$items.subtotal' },
        fees: { $sum: '$items.platformFee' },
        earnings: { $sum: '$items.vendorEarnings' },
        units: { $sum: '$items.quantity' },
        orders: { $addToSet: '$_id' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const topProducts = await Order.aggregate([
    ...matchPaidItems,
    {
      $group: {
        _id: '$items.product',
        name: { $first: '$items.productNameSnapshot' },
        image: { $first: '$items.imageSnapshot' },
        units: { $sum: '$items.quantity' },
        revenue: { $sum: '$items.subtotal' },
        earnings: { $sum: '$items.vendorEarnings' },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: 5 },
  ]);

  const [pendingOrders, productCount, activeProductCount, lowStock] = await Promise.all([
    Order.countDocuments({
      paymentStatus: 'paid',
      vendors: vendor,
      'items.fulfillmentStatus': { $in: ['processing', 'confirmed'] },
    }),
    Product.countDocuments({ vendor, isArchived: false }),
    Product.countDocuments({ vendor, isArchived: false, isActive: true }),
    Product.countDocuments({ vendor, isArchived: false, stock: { $lte: 3 } }),
  ]);

  const orderCount = totalsRow?.orders?.length || 0;
  const revenue = round2(totalsRow?.revenue || 0);

  return {
    range,
    from,
    to,
    totals: {
      revenue,
      platformFees: round2(totalsRow?.fees || 0),
      netEarnings: round2(totalsRow?.earnings || 0),
      orders: orderCount,
      unitsSold: totalsRow?.units || 0,
      averageOrderValue: orderCount ? round2(revenue / orderCount) : 0,
      pendingOrders,
      productCount,
      activeProductCount,
      lowStockCount: lowStock,
    },
    series: toDailySeries(dailyRows, from, to),
    topProducts: topProducts.map((p) => ({
      productId: p._id,
      name: p.name,
      image: p.image,
      units: p.units,
      revenue: round2(p.revenue),
      earnings: round2(p.earnings),
    })),
  };
}

export async function getAdminAnalytics(range = '30d') {
  const { from, to } = resolveRange(range);
  const paidInRange = {
    paymentStatus: 'paid',
    orderStatus: { $ne: 'cancelled' },
    createdAt: { $gte: from, $lte: to },
  };

  const [totalsRow] = await Order.aggregate([
    { $match: paidInRange },
    {
      $group: {
        _id: null,
        grossSales: { $sum: '$total' },
        merchandise: { $sum: '$subtotal' },
        platformRevenue: { $sum: '$platformFee' },
        vendorEarnings: { $sum: '$vendorEarnings' },
        orders: { $sum: 1 },
      },
    },
  ]);

  const dailyRows = await Order.aggregate([
    { $match: paidInRange },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenue: { $sum: '$total' },
        fees: { $sum: '$platformFee' },
        earnings: { $sum: '$vendorEarnings' },
        orders: { $addToSet: '$_id' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const topStores = await Order.aggregate([
    { $match: paidInRange },
    { $unwind: '$items' },
    { $match: { 'items.fulfillmentStatus': { $ne: 'cancelled' } } },
    {
      $group: {
        _id: '$items.vendor',
        name: { $first: '$items.vendorNameSnapshot' },
        revenue: { $sum: '$items.subtotal' },
        fees: { $sum: '$items.platformFee' },
        units: { $sum: '$items.quantity' },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: 8 },
  ]);

  const categoryBreakdown = await Order.aggregate([
    { $match: paidInRange },
    { $unwind: '$items' },
    {
      $lookup: {
        from: 'products',
        localField: 'items.product',
        foreignField: '_id',
        as: 'productDoc',
      },
    },
    { $unwind: { path: '$productDoc', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: { $ifNull: ['$productDoc.category', 'uncategorised'] },
        revenue: { $sum: '$items.subtotal' },
        units: { $sum: '$items.quantity' },
      },
    },
    { $sort: { revenue: -1 } },
  ]);

  const [totalUsers, totalVendors, activeStores, totalProducts, activeProducts, totalOrders] =
    await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: 'vendor' }),
      Store.countDocuments({ isActive: true }),
      Product.countDocuments({ isArchived: false }),
      Product.countDocuments({ isArchived: false, isActive: true }),
      Order.countDocuments({ paymentStatus: 'paid', orderStatus: { $ne: 'cancelled' } }),
    ]);

  const ordersInRange = totalsRow?.orders || 0;

  return {
    range,
    from,
    to,
    totals: {
      grossSales: round2(totalsRow?.grossSales || 0),
      merchandiseSales: round2(totalsRow?.merchandise || 0),
      platformRevenue: round2(totalsRow?.platformRevenue || 0),
      vendorEarnings: round2(totalsRow?.vendorEarnings || 0),
      ordersInRange,
      averageOrderValue: ordersInRange ? round2((totalsRow.grossSales || 0) / ordersInRange) : 0,
      totalUsers,
      totalVendors,
      activeStores,
      totalProducts,
      activeProducts,
      totalOrders,
    },
    series: toDailySeries(dailyRows, from, to),
    topStores: topStores.map((s) => ({
      storeId: s._id,
      name: s.name,
      revenue: round2(s.revenue),
      platformFees: round2(s.fees),
      units: s.units,
    })),
    categoryBreakdown: categoryBreakdown.map((c) => ({
      category: c._id,
      revenue: round2(c.revenue),
      units: c.units,
    })),
  };
}
