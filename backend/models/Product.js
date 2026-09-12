import mongoose from 'mongoose';

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: '' },
    alt: { type: String, default: '' },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      minlength: 3,
      maxlength: 120,
    },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: 20,
      maxlength: 5000,
    },
    price: { type: Number, required: true, min: [0.01, 'Price must be greater than 0'] },
    compareAtPrice: { type: Number, min: 0, default: null },
    category: { type: String, required: true, lowercase: true, trim: true, index: true },
    images: {
      type: [imageSchema],
      validate: [(v) => v.length <= 8, 'A product can have at most 8 images'],
      default: [],
    },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    vendorUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    stock: { type: Number, required: true, min: [0, 'Stock cannot be negative'], default: 0 },
    sku: { type: String, trim: true, uppercase: true, default: '' },
    tags: { type: [String], default: [], index: true },
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    unitsSold: { type: Number, default: 0, min: 0 },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },
    isArchived: { type: Boolean, default: false, index: true },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, price: 1 });
productSchema.index({ vendor: 1, isArchived: 1 });
productSchema.index({ createdAt: -1 });

productSchema.virtual('inStock').get(function inStock() {
  return this.stock > 0;
});

productSchema.virtual('isPubliclyVisible').get(function isPubliclyVisible() {
  return this.isActive && !this.isArchived;
});

const Product = mongoose.model('Product', productSchema);
export default Product;
