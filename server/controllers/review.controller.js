import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Review from '../models/Review.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import sendSuccess from '../utils/apiResponse.js';
import { buildMeta, getPagination } from '../utils/pagination.js';

/**
 * Verified-purchase check: there must be a *paid* order belonging to this
 * buyer that contains this product and was not cancelled.
 */
async function findPurchaseOrder(userId, productId, orderId) {
  const filter = {
    buyer: userId,
    paymentStatus: 'paid',
    items: { $elemMatch: { product: productId, fulfillmentStatus: { $ne: 'cancelled' } } },
  };
  if (orderId) filter._id = orderId;
  return Order.findOne(filter).sort({ createdAt: -1 });
}

export const createReview = asyncHandler(async (req, res) => {
  const { productId, orderId, rating, title, comment } = req.body;

  const product = await Product.findById(productId);
  if (!product) throw ApiError.notFound('That product no longer exists');

  const order = await findPurchaseOrder(req.user._id, productId, orderId);
  if (!order) {
    throw ApiError.forbidden('Only verified buyers of this product can review it');
  }

  const existing = await Review.findOne({ product: productId, user: req.user._id });
  if (existing) {
    throw ApiError.conflict('You have already reviewed this product - edit your review instead');
  }

  const review = await Review.create({
    product: productId,
    user: req.user._id,
    order: order._id,
    rating,
    title,
    comment,
  });

  // Flag the order line so the UI can stop prompting for a review.
  await Order.updateOne(
    { _id: order._id, 'items.product': productId },
    { $set: { 'items.$[item].reviewed': true } },
    { arrayFilters: [{ 'item.product': product._id }] }
  );

  const stats = await Review.recalculateProductRating(productId);
  await review.populate('user', 'name avatar');

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Thanks for reviewing this piece',
    data: { review, ...stats },
  });
});

export const listProductReviews = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 8, maxLimit: 50 });
  const filter = { product: req.params.id, isVisible: true };

  const [reviews, total, breakdown] = await Promise.all([
    Review.find(filter)
      .populate('user', 'name avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Review.countDocuments(filter),
    Review.aggregate([
      { $match: { product: new mongoose.Types.ObjectId(String(req.params.id)), isVisible: true } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
    ]),
  ]);

  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    rating: star,
    count: breakdown.find((b) => b._id === star)?.count || 0,
  }));

  return sendSuccess(res, {
    message: 'Reviews',
    data: { reviews, distribution },
    meta: buildMeta({ page, limit, total }),
  });
});

export const updateReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw ApiError.notFound('Review not found');
  if (String(review.user) !== String(req.user._id)) {
    throw ApiError.forbidden('You can only edit your own review');
  }

  for (const field of ['rating', 'title', 'comment']) {
    if (req.body[field] !== undefined) review[field] = req.body[field];
  }
  await review.save();
  const stats = await Review.recalculateProductRating(review.product);

  return sendSuccess(res, { message: 'Review updated', data: { review, ...stats } });
});

export const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw ApiError.notFound('Review not found');
  const isOwner = String(review.user) === String(req.user._id);
  if (!isOwner && req.user.role !== 'admin') {
    throw ApiError.forbidden('You can only delete your own review');
  }

  await review.deleteOne();
  const stats = await Review.recalculateProductRating(review.product);
  return sendSuccess(res, { message: 'Review removed', data: stats });
});

/** Products the signed-in buyer has bought but not yet reviewed. */
export const getReviewableProducts = asyncHandler(async (req, res) => {
  const orders = await Order.find({ buyer: req.user._id, paymentStatus: 'paid' })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const reviewed = new Set(
    (await Review.find({ user: req.user._id }).select('product').lean()).map((r) =>
      String(r.product)
    )
  );

  const seen = new Set();
  const pending = [];
  for (const order of orders) {
    for (const item of order.items) {
      const key = String(item.product);
      if (item.fulfillmentStatus === 'cancelled' || reviewed.has(key) || seen.has(key)) continue;
      seen.add(key);
      pending.push({
        productId: item.product,
        orderId: order._id,
        orderNumber: order.orderNumber,
        name: item.productNameSnapshot,
        slug: item.productSlugSnapshot,
        image: item.imageSnapshot,
        purchasedAt: order.paidAt || order.createdAt,
      });
    }
  }

  return sendSuccess(res, { message: 'Awaiting your review', data: pending });
});
