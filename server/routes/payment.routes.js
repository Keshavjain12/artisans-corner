import { Router } from 'express';
import {
  confirmPayment,
  createPaymentIntent,
  getPaymentConfig,
  getQuote,
} from '../controllers/payment.controller.js';
import { authenticateUser } from '../middleware/auth.js';
import { sensitiveLimiter } from '../middleware/rateLimit.js';
import validate from '../middleware/validate.js';
import {
  confirmPaymentSchema,
  createIntentSchema,
  quoteSchema,
} from '../validators/order.validator.js';

const router = Router();

router.get('/config', getPaymentConfig);
router.post('/quote', authenticateUser, validate(quoteSchema), getQuote);
router.post(
  '/create-intent',
  authenticateUser,
  sensitiveLimiter,
  validate(createIntentSchema),
  createPaymentIntent
);
router.post(
  '/confirm',
  authenticateUser,
  sensitiveLimiter,
  validate(confirmPaymentSchema),
  confirmPayment
);

export default router;
