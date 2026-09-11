import rateLimit from 'express-rate-limit';
import env from '../config/env.js';

const baseOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  // Rate limits get in the way of the test suite and of local seeding.
  skip: () => env.isTest,
  message: {
    success: false,
    message: 'Too many requests. Please slow down and try again shortly.',
  },
};

/** Broad protection for the whole API surface. */
export const apiLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: 1000,
});

/** Tight limit on credential endpoints to blunt brute-force attempts. */
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

/**
 * Signed-in callers are counted individually, falling back to the address for
 * anonymous ones. Keying purely on IP would make one shared college or office
 * connection a single bucket, so one busy seller could lock out everybody else
 * on the same network.
 */
const perUserOrIp = (req) => (req.user ? `u:${req.user._id}` : req.ip);

/** Payments and uploads are expensive; keep them modest per user or address. */
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
