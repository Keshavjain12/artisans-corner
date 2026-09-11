import Store from '../models/Store.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { verifyToken } from '../utils/token.js';

function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  if (req.cookies?.token) return req.cookies.token;
  return null;
}

/** Rejects the request unless a valid JWT maps to an active user. */
export const authenticateUser = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) throw ApiError.unauthorized('Please sign in to continue');

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw ApiError.unauthorized('Your session has expired, please sign in again');
  }

  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.unauthorized('This account no longer exists');
  if (!user.isActive) throw ApiError.forbidden('This account has been deactivated');

  req.user = user;
  return next();
});

/** Attaches req.user when a token is present, but never blocks the request. */
export const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const payload = verifyToken(token);
    const user = await User.findById(payload.sub);
    if (user?.isActive) req.user = user;
  } catch {
    /* an invalid token simply means "anonymous" here */
  }
  return next();
});

/** Route guard: `authorizeRoles('vendor', 'admin')`. */
export const authorizeRoles =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden(`This area is restricted to: ${roles.join(', ')}`));
    }
    return next();
  };

/** Vendor routes: requires the vendor role *and* an existing store profile. */
export const requireStore = asyncHandler(async (req, _res, next) => {
  if (!req.user) throw ApiError.unauthorized();
  if (!['vendor', 'admin'].includes(req.user.role)) {
    throw ApiError.forbidden('Become a seller to access your vendor dashboard');
  }
  const store = await Store.findOne({ owner: req.user._id });
  if (!store) throw ApiError.forbidden('Finish setting up your store first');
  if (!store.isActive && req.user.role !== 'admin') {
    throw ApiError.forbidden('Your store is currently suspended');
  }
  req.store = store;
  return next();
});
