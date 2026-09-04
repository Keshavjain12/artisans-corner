import { z } from 'zod';
import { objectId } from './common.js';

export const createReviewSchema = z.object({
  productId: objectId,
  orderId: objectId.optional(),
  rating: z.coerce
    .number({ required_error: 'Please pick a star rating' })
    .int('Ratings are whole stars')
    .min(1, 'Ratings run from 1 to 5 stars')
    .max(5, 'Ratings run from 1 to 5 stars'),
  title: z.string().trim().max(120).optional().default(''),
  comment: z
    .string({ required_error: 'Please write a short review' })
    .trim()
    .min(5, 'Reviews need at least 5 characters')
    .max(1500, 'Reviews are limited to 1500 characters'),
});

export const updateReviewSchema = createReviewSchema
  .pick({ rating: true, title: true, comment: true })
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: 'Nothing to update' });
