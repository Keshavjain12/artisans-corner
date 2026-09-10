import { Router } from 'express';
import {
  createReview,
  deleteReview,
  getReviewableProducts,
  updateReview,
} from '../controllers/review.controller.js';
import { authenticateUser } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimit.js';
import validate from '../middleware/validate.js';
import { createReviewSchema, updateReviewSchema } from '../validators/review.validator.js';

const router = Router();

router.use(authenticateUser);

router.get('/pending', getReviewableProducts);
router.post('/', writeLimiter, validate(createReviewSchema), createReview);
router.put('/:id', writeLimiter, validate(updateReviewSchema), updateReview);
router.delete('/:id', deleteReview);

export default router;
