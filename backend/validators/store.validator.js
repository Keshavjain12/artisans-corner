import { z } from 'zod';
import { trimmed } from './common.js';

const locationSchema = z.object({
  city: z.string().trim().max(60).optional().default(''),
  state: z.string().trim().max(60).optional().default(''),
  country: z.string().trim().max(60).optional().default(''),
});

export const onboardStoreSchema = z.object({
  name: trimmed(2, 60, 'Store name'),
  description: trimmed(20, 1200, 'Store description'),
  tagline: z.string().trim().max(120).optional().default(''),
  logo: z.string().trim().max(500).optional().default(''),
  banner: z.string().trim().max(500).optional().default(''),
  location: locationSchema.optional(),
  contactEmail: z.string().trim().toLowerCase().email('Enter a valid email').or(z.literal('')).optional(),
  contactPhone: z.string().trim().max(20).optional().default(''),
});

export const updateStoreSchema = onboardStoreSchema.partial().extend({
  isActive: z.boolean().optional(),
});
