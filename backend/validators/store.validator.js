import { z } from 'zod';
import { optionalImageUrl, trimmed } from './common.js';

const locationSchema = z.object({
  city: z.string().trim().max(60).optional().default(''),
  state: z.string().trim().max(60).optional().default(''),
  country: z.string().trim().max(60).optional().default(''),
});

export const onboardStoreSchema = z.object({
  name: trimmed(2, 60, 'Store name'),
  description: trimmed(20, 1200, 'Store description'),
  tagline: z.string().trim().max(120).optional().default(''),
  // Same rule as product images: an upload of ours, or nothing.
  logo: optionalImageUrl,
  banner: optionalImageUrl,
  location: locationSchema.optional(),
  contactEmail: z.string().trim().toLowerCase().email('Enter a valid email').or(z.literal('')).optional(),
  contactPhone: z.string().trim().max(20).optional().default(''),
});

export const updateStoreSchema = onboardStoreSchema.partial().extend({
  isActive: z.boolean().optional(),
});
