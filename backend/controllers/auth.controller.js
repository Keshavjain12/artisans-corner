import Store from '../models/Store.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import sendSuccess from '../utils/apiResponse.js';
import { clearAuthCookie, setAuthCookie, signToken } from '../utils/token.js';

async function buildSession(user) {
  const store = user.store ? await Store.findById(user.store).lean() : null;
  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      phone: user.phone,
      isActive: user.isActive,
      defaultShippingAddress: user.defaultShippingAddress || null,
      createdAt: user.createdAt,
    },
    store: store
      ? { id: store._id, name: store.name, slug: store.slug, logo: store.logo, isActive: store.isActive }
      : null,
  };
}

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) throw ApiError.conflict('An account with that email already exists');

  const user = await User.create({ name, email, password });

  const token = signToken({ sub: user._id.toString(), role: user.role });
  setAuthCookie(res, token);

  return sendSuccess(res, {
    statusCode: 201,
    message: `Welcome to Artisan's Corner, ${user.name.split(' ')[0]}`,
    data: { token, ...(await buildSession(user)) },
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Incorrect email or password');
  }
  if (!user.isActive) throw ApiError.forbidden('This account has been deactivated');

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  const token = signToken({ sub: user._id.toString(), role: user.role });
  setAuthCookie(res, token);

  return sendSuccess(res, {
    message: `Welcome back, ${user.name.split(' ')[0]}`,
    data: { token, ...(await buildSession(user)) },
  });
});

export const getMe = asyncHandler(async (req, res) =>
  sendSuccess(res, { message: 'Current user', data: await buildSession(req.user) })
);

export const logout = asyncHandler(async (_req, res) => {
  clearAuthCookie(res);
  return sendSuccess(res, { message: 'Signed out' });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const updates = {};
  for (const field of ['name', 'phone', 'avatar']) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }
  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });
  return sendSuccess(res, { message: 'Profile updated', data: await buildSession(user) });
});

export const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(req.body.currentPassword))) {
    throw ApiError.badRequest('Your current password is incorrect');
  }
  user.password = req.body.newPassword;
  await user.save();
  return sendSuccess(res, { message: 'Password updated' });
});
