import { Router } from 'express';
import {
  createProduct,
  deleteProduct,
  getMyProduct,
  getProduct,
  listMyProducts,
  listProducts,
  restoreProduct,
  updateProduct,
} from '../controllers/product.controller.js';
import { listProductReviews } from '../controllers/review.controller.js';
import { authenticateUser, optionalAuth, requireStore } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimit.js';
import validate from '../middleware/validate.js';
import {
  createProductSchema,
  listProductsQuerySchema,
  updateProductSchema,
} from '../validators/product.validator.js';

const router = Router();

/* Vendor-owned routes are declared before "/:idOrSlug" so they are not
   swallowed by the public product lookup. */
router.get('/mine', authenticateUser, requireStore, listMyProducts);
router.post(
  '/',
  authenticateUser,
  requireStore,
  writeLimiter,
  validate(createProductSchema),
  createProduct
);
router.get('/mine/:id', authenticateUser, requireStore, getMyProduct);
router.put(
  '/:id',
  authenticateUser,
  requireStore,
  writeLimiter,
  validate(updateProductSchema),
  updateProduct
);
router.delete('/:id', authenticateUser, requireStore, writeLimiter, deleteProduct);
router.post('/:id/restore', authenticateUser, requireStore, restoreProduct);

router.get('/', validate(listProductsQuerySchema, 'query'), listProducts);
router.get('/:id/reviews', listProductReviews);
router.get('/:idOrSlug', optionalAuth, getProduct);

export default router;
