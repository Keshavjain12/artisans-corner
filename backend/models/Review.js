import mongoose from 'mongoose';
import Product from './Product.js';

const reviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Proof of purchase: the paid order this review is attached to.
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, trim: true, maxlength: 120, default: '' },
    comment: { type: String, required: true, trim: true, minlength: 5, maxlength: 1500 },
    isVisible: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// One review per buyer per product (editable afterwards).
reviewSchema.index({ product: 1, user: 1 }, { unique: true });
reviewSchema.index({ product: 1, createdAt: -1 });

reviewSchema.statics.recalculateProductRating = async function recalculate(productId) {
  const [stats] = await this.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(String(productId)), isVisible: true } },
    { $group: { _id: '$product', average: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  const ratingAverage = stats ? Math.round(stats.average * 10) / 10 : 0;
  const reviewCount = stats ? stats.count : 0;
  await Product.findByIdAndUpdate(productId, { ratingAverage, reviewCount });
  return { ratingAverage, reviewCount };
};

const Review = mongoose.model('Review', reviewSchema);
export default Review;
