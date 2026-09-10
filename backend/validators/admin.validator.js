import { z } from 'zod';
import { USER_ROLES } from '../models/User.js';

export const updateUserSchema = z
  .object({
    isActive: z.boolean().optional(),
    role: z.enum(USER_ROLES).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'Nothing to update' });

export const moderateSchema = z
  .object({
    isActive: z.boolean().optional(),
    reason: z.string().trim().max(300).optional().default(''),
  })
  .refine((data) => data.isActive !== undefined, { message: 'Specify the new state' });
