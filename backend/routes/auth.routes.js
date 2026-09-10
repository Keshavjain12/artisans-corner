import { Router } from 'express';
import {
  changePassword,
  getMe,
  login,
  logout,
  register,
  updateProfile,
} from '../controllers/auth.controller.js';
import { authenticateUser } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import validate from '../middleware/validate.js';
import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
  updateProfileSchema,
} from '../validators/auth.validator.js';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/logout', logout);
router.get('/me', authenticateUser, getMe);
router.put('/me', authenticateUser, validate(updateProfileSchema), updateProfile);
router.put(
  '/change-password',
  authenticateUser,
  authLimiter,
  validate(changePasswordSchema),
  changePassword
);

export default router;
