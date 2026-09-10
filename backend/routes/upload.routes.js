import { Router } from 'express';
import {
  deleteUploadedImage,
  uploadProductImages,
  uploadStoreImage,
} from '../controllers/upload.controller.js';
import { authenticateUser, authorizeRoles } from '../middleware/auth.js';
import { sensitiveLimiter } from '../middleware/rateLimit.js';
import { uploadImages } from '../middleware/upload.js';

const router = Router();

router.use(authenticateUser, authorizeRoles('vendor', 'admin'), sensitiveLimiter);

router.post('/products', uploadImages.array('images', 6), uploadProductImages);
router.post('/store', uploadImages.array('images', 1), uploadStoreImage);
router.delete('/', deleteUploadedImage);

export default router;
