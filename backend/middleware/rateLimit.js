import rateLimit from 'express-rate-limit';
import env from '../config/env.js';

const baseOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.isTest,
  message: {
    success: false,
    message: 'Too many requests. Please slow down and try again shortly.',
  },
};

export const apiLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: 1000,
});

export const authLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Too many attempts from this address. Please try again in 15 minutes.',
  },
});

const perUserOrIp = (req) => (req.user ? `u:${req.user._id}` : req.ip);

export const sensitiveLimiter = rateLimit({
  ...baseOptions,
  windowMs: 10 * 60 * 1000,
  limit: 60,
  keyGenerator: perUserOrIp,
});

export const writeLimiter = rateLimit({
  ...baseOptions,
  windowMs: 10 * 60 * 1000,
  limit: 200,
  keyGenerator: perUserOrIp,
});
