import mongoose from 'mongoose';

export const PAYOUT_STATUSES = ['pending', 'processing', 'paid', 'reversed'];

const payoutSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    orderNumber: { type: String, required: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    vendorUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    grossSales: { type: Number, required: true, min: 0 },
    commissionRate: { type: Number, required: true, min: 0, max: 1 },
    platformFee: { type: Number, required: true, min: 0 },
    netEarnings: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'usd' },
    status: { type: String, enum: PAYOUT_STATUSES, default: 'pending', index: true },
    settledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

payoutSchema.index({ order: 1, vendor: 1 }, { unique: true });

const Payout = mongoose.model('Payout', payoutSchema);
export default Payout;
