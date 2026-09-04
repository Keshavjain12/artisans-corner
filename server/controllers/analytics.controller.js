import asyncHandler from '../utils/asyncHandler.js';
import sendSuccess from '../utils/apiResponse.js';
import { getAdminAnalytics, getVendorAnalytics } from '../services/analytics.service.js';

export const getMyStoreAnalytics = asyncHandler(async (req, res) => {
  const data = await getVendorAnalytics(req.store._id, req.query.range || '30d');
  return sendSuccess(res, { message: 'Store analytics', data });
});

export const getPlatformAnalytics = asyncHandler(async (req, res) => {
  const data = await getAdminAnalytics(req.query.range || '30d');
  return sendSuccess(res, { message: 'Platform analytics', data });
});
