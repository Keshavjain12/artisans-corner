import { Router } from 'express';
import {
  cancelOrder,
  getMyOrders,
  getOrderById,
  updateFulfilmentStatus,
} from '../controllers/order.controller.js';
import { authenticateUser, requireStore } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { updateFulfilmentSchema } from '../validators/order.validator.js';

const router = Router();

router.use(authenticateUser);

router.get('/my-orders', getMyOrders);
router.get('/:id', getOrderById);
router.put('/:id/status', requireStore, validate(updateFulfilmentSchema), updateFulfilmentStatus);
router.post('/:id/cancel', cancelOrder);

export default router;
