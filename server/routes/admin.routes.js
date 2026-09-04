import { Router } from 'express';
import {
  getRevenueReport,
  listOrders,
  listProducts,
  listStores,
  listUsers,
  moderateProduct,
  moderateStore,
  settlePayout,
  updateUser,
} from '../controllers/admin.controller.js';
import { getPlatformAnalytics } from '../controllers/analytics.controller.js';
import { authenticateUser, authorizeRoles } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { moderateSchema, updateUserSchema } from '../validators/admin.validator.js';

const router = Router();

router.use(authenticateUser, authorizeRoles('admin'));

router.get('/users', listUsers);
router.put('/users/:id', validate(updateUserSchema), updateUser);

router.get('/vendors', listStores);
router.put('/vendors/:id/status', validate(moderateSchema), moderateStore);

router.get('/products', listProducts);
router.put('/products/:id/status', validate(moderateSchema), moderateProduct);

router.get('/orders', listOrders);
router.get('/revenue', getRevenueReport);
router.put('/payouts/:id/settle', settlePayout);
router.get('/analytics', getPlatformAnalytics);

export default router;
