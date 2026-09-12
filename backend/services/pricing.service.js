import env from '../config/env.js';
import Product from '../models/Product.js';
import ApiError from '../utils/ApiError.js';
import { round2, splitCommission } from '../utils/money.js';

export const MAX_QTY_PER_LINE = 20;

export async function buildCheckoutQuote(rawItems = []) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw ApiError.badRequest('Your cart is empty');
  }

  const requested = new Map();
  for (const item of rawItems) {
    const id = String(item.productId || item.product || '');
    const qty = Number(item.quantity);
    if (!id) throw ApiError.badRequest('A cart item is missing its product');
    if (!Number.isInteger(qty) || qty < 1) {
      throw ApiError.badRequest('Quantities must be whole numbers of 1 or more');
    }
    requested.set(id, Math.min((requested.get(id) || 0) + qty, MAX_QTY_PER_LINE));
  }

  const products = await Product.find({ _id: { $in: [...requested.keys()] } }).populate(
    'vendor',
    'name slug isActive owner'
  );
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const commissionRate = env.commissionRate;
  const lineItems = [];

  for (const [productId, quantity] of requested) {
    const product = byId.get(productId);
    if (!product) throw ApiError.badRequest('One of the items in your cart no longer exists');
    if (!product.isActive || product.isArchived) {
      throw ApiError.badRequest(`"${product.name}" is no longer available`);
    }
    if (!product.vendor || product.vendor.isActive === false) {
      throw ApiError.badRequest(`The shop selling "${product.name}" is not accepting orders`);
    }
    if (product.stock < quantity) {
      throw ApiError.badRequest(
        product.stock === 0
          ? `"${product.name}" has just sold out`
          : `Only ${product.stock} left of "${product.name}"`
      );
    }

    const priceSnapshot = round2(product.price);
    const subtotal = round2(priceSnapshot * quantity);
    const { platformFee, vendorEarnings } = splitCommission(subtotal, commissionRate);

    lineItems.push({
      product: product._id,
      vendor: product.vendor._id,
      vendorUser: product.vendorUser,
      productNameSnapshot: product.name,
      productSlugSnapshot: product.slug,
      imageSnapshot: product.images?.[0]?.url || '',
      vendorNameSnapshot: product.vendor.name,
      priceSnapshot,
      quantity,
      subtotal,
      commissionRate,
      platformFee,
      vendorEarnings,
    });
  }

  const subtotal = round2(lineItems.reduce((sum, l) => sum + l.subtotal, 0));
  const shippingCost =
    subtotal >= env.freeShippingThreshold ? 0 : round2(env.shippingFlatRate);
  const tax = round2(subtotal * env.taxRate);
  const total = round2(subtotal + shippingCost + tax);

  const platformFee = round2(lineItems.reduce((sum, l) => sum + l.platformFee, 0));
  const vendorEarnings = round2(lineItems.reduce((sum, l) => sum + l.vendorEarnings, 0));

  return {
    lineItems,
    vendors: [...new Set(lineItems.map((l) => String(l.vendor)))],
    totals: {
      subtotal,
      shippingCost,
      tax,
      total,
      commissionRate,
      platformFee,
      vendorEarnings,
      currency: env.currency,
      freeShippingThreshold: env.freeShippingThreshold,
    },
  };
}

export default buildCheckoutQuote;
