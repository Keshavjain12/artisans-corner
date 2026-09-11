import { Router } from 'express';
import env from '../config/env.js';
import { listCategories } from '../controllers/product.controller.js';
import adminRoutes from './admin.routes.js';
import authRoutes from './auth.routes.js';
import orderRoutes from './order.routes.js';
import paymentRoutes from './payment.routes.js';
import productRoutes from './product.routes.js';
import reviewRoutes from './review.routes.js';
import uploadRoutes from './upload.routes.js';
import vendorRoutes from './vendor.routes.js';

const router = Router();

router.get('/health', (_req, res) =>
  res.json({
    success: true,
    message: 'Artisan\u2019s Corner API is running',
    data: {
      environment: env.nodeEnv,
      // Kind only, never the name or host: this endpoint is public.
      database: env.ephemeralDb ? 'ephemeral' : 'persistent',
      payments: env.stripeEnabled ? 'stripe' : env.allowMockPayments ? 'mock' : 'disabled',
      demo: env.demoDeployment,
      imageStorage: env.cloudinaryEnabled ? 'cloudinary' : 'local-disk',
      commissionRate: env.commissionRate,
      time: new Date().toISOString(),
    },
  })
);

router.get('/categories', listCategories);

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/vendors', vendorRoutes);
router.use('/orders', orderRoutes);
router.use('/reviews', reviewRoutes);
router.use('/payments', paymentRoutes);
router.use('/uploads', uploadRoutes);
router.use('/admin', adminRoutes);

export default router;
