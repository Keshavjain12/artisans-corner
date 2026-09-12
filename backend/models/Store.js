import mongoose from 'mongoose';

const storeSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Store name is required'],
      trim: true,
      minlength: 2,
      maxlength: 60,
    },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    description: {
      type: String,
      required: [true, 'Tell shoppers what you make'],
      trim: true,
      maxlength: 1200,
    },
    tagline: { type: String, trim: true, maxlength: 120, default: '' },
    logo: { type: String, default: '' },
    banner: { type: String, default: '' },
    location: {
      city: { type: String, trim: true, default: '' },
      state: { type: String, trim: true, default: '' },
      country: { type: String, trim: true, default: '' },
    },
    contactEmail: { type: String, trim: true, lowercase: true, default: '' },
    contactPhone: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true, index: true },
    suspendedReason: { type: String, default: '' },
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    totalSales: { type: Number, default: 0, min: 0 },
    totalOrders: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

storeSchema.index({ name: 'text', description: 'text' });

const Store = mongoose.model('Store', storeSchema);
export default Store;
