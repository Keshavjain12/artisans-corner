import { z } from 'zod';

export const objectId = z
  .string()
  .trim()
  .regex(/^[0-9a-fA-F]{24}$/, 'That identifier is not valid');

export const trimmed = (min, max, label = 'This field') =>
  z
    .string({ required_error: `${label} is required` })
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

export const optionalUrl = z
  .string()
  .trim()
  .url('Must be a valid URL')
  .or(z.literal(''))
  .optional();

export const passwordSchema = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const emailSchema = z
  .string({ required_error: 'Email is required' })
  .trim()
  .toLowerCase()
  .email('Enter a valid email address');

export const shippingAddressSchema = z.object({
  fullName: trimmed(2, 80, 'Full name'),
  addressLine1: trimmed(4, 120, 'Address'),
  addressLine2: z.string().trim().max(120).optional().default(''),
  city: trimmed(2, 60, 'City'),
  state: trimmed(1, 60, 'State'),
  postalCode: trimmed(3, 16, 'Postal code'),
  country: trimmed(2, 60, 'Country'),
  phone: trimmed(6, 20, 'Phone number'),
});

export const cartItemsSchema = z
  .array(
    z.object({
      productId: objectId,
      quantity: z.coerce.number().int().min(1).max(20),
    })
  )
  .min(1, 'Your cart is empty')
  .max(50, 'That is too many different items for one order');
