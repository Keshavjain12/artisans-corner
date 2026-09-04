import Product from '../models/Product.js';
import Store from '../models/Store.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import sendSuccess from '../utils/apiResponse.js';
import { buildMeta, getPagination } from '../utils/pagination.js';
import { uniqueSlug } from '../utils/slugify.js';

/** "Become a Seller": upgrades the current buyer account and creates its shop. */
export const onboardVendor = asyncHandler(async (req, res) => {
  const existing = await Store.findOne({ owner: req.user._id });
  if (existing) throw ApiError.conflict('You already have a store');

  const slug = await uniqueSlug(req.body.name, async (candidate) =>
    Boolean(await Store.exists({ slug: candidate }))
  );

  const store = await Store.create({
    ...req.body,
    slug,
    owner: req.user._id,
    contactEmail: req.body.contactEmail || req.user.email,
  });

  // Admins keep their admin role; buyers are promoted to vendor.
  const role = req.user.role === 'admin' ? 'admin' : 'vendor';
  await User.findByIdAndUpdate(req.user._id, { role, store: store._id });

  return sendSuccess(res, {
    statusCode: 201,
    message: `${store.name} is live - welcome to the marketplace`,
    data: { store },
  });
});

export const getMyStore = asyncHandler(async (req, res) => {
  const store = await Store.findOne({ owner: req.user._id });
  if (!store) throw ApiError.notFound('You have not set up a store yet');
  return sendSuccess(res, { message: 'Your store', data: { store } });
});

export const updateMyStore = asyncHandler(async (req, res) => {
  const store = await Store.findOne({ owner: req.user._id });
  if (!store) throw ApiError.notFound('You have not set up a store yet');

  const updatable = [
    'name',
    'description',
    'tagline',
    'logo',
    'banner',
    'location',
    'contactEmail',
    'contactPhone',
    'isActive',
  ];
  for (const field of updatable) {
    if (req.body[field] !== undefined) store[field] = req.body[field];
  }

  if (req.body.name && req.body.name !== store.name) {
    store.slug = await uniqueSlug(req.body.name, async (candidate) =>
      Boolean(await Store.exists({ slug: candidate, _id: { $ne: store._id } }))
    );
  }

  await store.save();
  return sendSuccess(res, { message: 'Store profile updated', data: { store } });
});

/** Public directory of shops, ranked by sales so the homepage can feature them. */
export const listStores = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 12, maxLimit: 48 });
  const filter = { isActive: true };
  if (req.query.q) filter.name = { $regex: String(req.query.q).slice(0, 60), $options: 'i' };

  const [stores, total] = await Promise.all([
    Store.find(filter).sort({ totalSales: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    Store.countDocuments(filter),
  ]);

  const counts = await Product.aggregate([
    {
      $match: {
        vendor: { $in: stores.map((s) => s._id) },
        isActive: true,
        isArchived: false,
      },
    },
    { $group: { _id: '$vendor', productCount: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.productCount]));

  return sendSuccess(res, {
    message: 'Artisan shops',
    data: stores.map((s) => ({ ...s, productCount: countMap.get(String(s._id)) || 0 })),
    meta: buildMeta({ page, limit, total }),
  });
});

export const getStoreBySlug = asyncHandler(async (req, res) => {
  const store = await Store.findOne({ slug: req.params.slug, isActive: true }).lean();
  if (!store) throw ApiError.notFound('That shop could not be found');

  const products = await Product.find({
    vendor: store._id,
    isActive: true,
    isArchived: false,
  })
    .sort({ createdAt: -1 })
    .limit(24)
    .lean();

  return sendSuccess(res, {
    message: store.name,
    data: { store, products, productCount: products.length },
  });
});
