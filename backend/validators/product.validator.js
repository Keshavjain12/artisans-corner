import { z } from 'zod';
import { imageUrl, trimmed } from './common.js';

const imageSchema = z.object({
  url: imageUrl,
  publicId: z.string().trim().max(200).optional().default(''),
  alt: z.string().trim().max(160).optional().default(''),
});

export const createProductSchema = z
  .object({
    name: trimmed(3, 120, 'Product name'),
    description: trimmed(20, 5000, 'Description'),
    price: z.coerce.number().positive('Price must be greater than 0').max(1000000),
    compareAtPrice: z.coerce.number().min(0).max(1000000).nullish(),
    category: trimmed(2, 60, 'Category').toLowerCase(),
    stock: z.coerce.number().int('Stock must be a whole number').min(0, 'Stock cannot be negative'),
    sku: z.string().trim().max(40).optional().default(''),
    tags: z.array(z.string().trim().min(1).max(30)).max(12).optional().default([]),
    images: z.array(imageSchema).max(8).optional().default([]),
    isActive: z.boolean().optional().default(true),
  })
  .refine(
    (data) =>
      data.compareAtPrice === null ||
      data.compareAtPrice === undefined ||
      data.compareAtPrice === 0 ||
      data.compareAtPrice > data.price,
    { message: 'Compare-at price should be higher than the selling price', path: ['compareAtPrice'] }
  );

export const updateProductSchema = z.object({
  name: trimmed(3, 120, 'Product name').optional(),
  description: trimmed(20, 5000, 'Description').optional(),
  price: z.coerce.number().positive('Price must be greater than 0').max(1000000).optional(),
  compareAtPrice: z.coerce.number().min(0).max(1000000).nullish(),
  category: trimmed(2, 60, 'Category').toLowerCase().optional(),
  stock: z.coerce.number().int().min(0, 'Stock cannot be negative').optional(),
  sku: z.string().trim().max(40).optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(12).optional(),
  images: z.array(imageSchema).max(8).optional(),
  isActive: z.boolean().optional(),
});

export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(60).optional(),
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().max(60).optional(),
  vendor: z.string().trim().max(80).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  inStock: z.enum(['true', 'false']).optional(),
  tag: z.string().trim().max(40).optional(),
  featured: z.enum(['true', 'false']).optional(),
  sort: z
    .enum(['featured', 'newest', 'price-asc', 'price-desc', 'rating', 'best-selling'])
    .optional(),
});
