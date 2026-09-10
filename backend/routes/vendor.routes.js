import { Router } from 'express';
import {
  getMyStore,
  getStoreBySlug,
  listStores,
  onboardVendor,
  updateMyStore,
} from '../controllers/store.controller.js';
import { getMyStoreAnalytics } from '../controllers/analytics.controller.js';
import { getVendorOrders, getVendorPayouts } from '../controllers/order.controller.js';
import { authenticateUser, requireStore } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimit.js';
import validate from '../middleware/validate.js';
import { onboardStoreSchema, updateStoreSchema } from '../validators/store.validator.js';

const router = Router();

router.post(
  '/onboard',
  authenticateUser,
  writeLimiter,
  validate(onboardStoreSchema),
  onboardVendor
);
router.get('/me', authenticateUser, getMyStore);
router.put('/me', authenticateUser, requireStore, validate(updateStoreSchema), updateMyStore);
router.get('/me/analytics', authenticateUser, requireStore, getMyStoreAnalytics);
router.get('/me/orders', authenticateUser, requireStore, getVendorOrders);
router.get('/me/payouts', authenticateUser, requireStore, getVendorPayouts);

router.get('/', listStores);
router.get('/:slug', getStoreBySlug);

export default router;
