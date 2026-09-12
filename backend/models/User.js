import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export const USER_ROLES = ['buyer', 'vendor', 'admin'];

const addressSchema = new mongoose.Schema(
  {
    fullName: { type: String, trim: true },
    addressLine1: { type: String, trim: true },
    addressLine2: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    country: { type: String, trim: true },
    phone: { type: String, trim: true },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 80 },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
      select: false,
    },
    role: { type: String, enum: USER_ROLES, default: 'buyer', index: true },
    avatar: { type: String, default: '' },
    phone: { type: String, trim: true, default: '' },
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', default: null },
    defaultShippingAddress: { type: addressSchema, default: undefined },
    isActive: { type: Boolean, default: true, index: true },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

userSchema.virtual('isVendor').get(function isVendor() {
  return this.role === 'vendor' || this.role === 'admin';
});

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  return next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
