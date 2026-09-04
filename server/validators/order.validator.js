import { z } from 'zod';
import { FULFILMENT_STATUSES } from '../models/Order.js';
import { cartItemsSchema, shippingAddressSchema } from './common.js';

/** Quote requests only ever carry product ids + quantities - never prices. */
export const quoteSchema = z.object({
  items: cartItemsSchema,
});

export const createIntentSchema = z.object({
  items: cartItemsSchema,
  shippingAddress: shippingAddressSchema,
  saveAddress: z.boolean().optional().default(false),
});

export const confirmPaymentSchema = z.object({
  paymentIntentId: z.string().trim().min(4, 'A payment reference is required'),
});

export const updateFulfilmentSchema = z.object({
  status: z.enum(FULFILMENT_STATUSES),
  trackingNumber: z.string().trim().max(60).optional().default(''),
  itemIds: z.array(z.string().trim()).optional(),
});
