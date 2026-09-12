import mongoose from 'mongoose';

export const ORDER_STATUSES = [
  'pending_payment',
  'processing',
  'confirmed',
  'shipped',
  'delivered',
  'cancelled',
];
export const FULFILMENT_STATUSES = ['processing', 'confirmed', 'shipped', 'delivered', 'cancelled'];
export const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'];

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    vendorUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    productNameSnapshot: { type: String, required: true },
    productSlugSnapshot: { type: String, default: '' },
    imageSnapshot: { type: String, default: '' },
    vendorNameSnapshot: { type: String, default: '' },

    priceSnapshot: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true, min: 0 },

    commissionRate: { type: Number, required: true, min: 0, max: 1 },
    platformFee: { type: Number, required: true, min: 0 },
    vendorEarnings: { type: Number, required: true, min: 0 },

    fulfillmentStatus: { type: String, enum: FULFILMENT_STATUSES, default: 'processing' },
    trackingNumber: { type: String, default: '' },
    reviewed: { type: Boolean, default: false },
    restocked: { type: Boolean, default: false },
  },
  { _id: true }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    addressLine1: { type: String, required: true, trim: true },
    addressLine2: { type: String, trim: true, default: '' },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true, index: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: {
      type: [orderItemSchema],
      validate: [(v) => v.length > 0, 'An order needs at least one item'],
    },
    vendors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Store', index: true }],

    shippingAddress: { type: shippingAddressSchema, required: true },

    subtotal: { type: Number, required: true, min: 0 },
    shippingCost: { type: Number, required: true, min: 0, default: 0 },
    tax: { type: Number, required: true, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'usd' },

    commissionRate: { type: Number, required: true, min: 0, max: 1 },
    platformFee: { type: Number, required: true, min: 0, default: 0 },
    vendorEarnings: { type: Number, required: true, min: 0, default: 0 },

    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'pending', index: true },
    paymentProvider: { type: String, default: 'stripe' },
    stripePaymentIntentId: { type: String, index: true, sparse: true },
    stripeChargeId: { type: String, default: '' },
    paidAt: { type: Date, default: null },
    paymentError: { type: String, default: '' },

    orderStatus: { type: String, enum: ORDER_STATUSES, default: 'pending_payment', index: true },
    inventoryApplied: { type: Boolean, default: false },
    statusHistory: [
      {
        status: { type: String },
        note: { type: String, default: '' },
        at: { type: Date, default: Date.now },
      },
    ],
    cancelledAt: { type: Date, default: null },
    notes: { type: String, default: '', maxlength: 500 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

orderSchema.index({ buyer: 1, createdAt: -1 });
orderSchema.index({ 'items.vendor': 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, createdAt: -1 });

orderSchema.pre('validate', function assignOrderNumber(next) {
  if (!this.orderNumber) {
    const stamp = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    this.orderNumber = `AC-${stamp}-${rand}`;
  }
  next();
});

orderSchema.virtual('itemCount').get(function itemCount() {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

const Order = mongoose.model('Order', orderSchema);
export default Order;
