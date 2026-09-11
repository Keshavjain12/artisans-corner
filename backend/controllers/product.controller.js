import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Store from '../models/Store.js';
import Category from '../models/Category.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import sendSuccess from '../utils/apiResponse.js';
import { buildMeta, getPagination } from '../utils/pagination.js';
import { uniqueSlug } from '../utils/slugify.js';
import { destroyImage } from '../services/upload.service.js';
import { searchRegex, searchWords, wordRegex } from '../utils/search.js';

const SORTS = {
  featured: { isFeatured: -1, ratingAverage: -1, unitsSold: -1 },
  newest: { createdAt: -1 },
  'price-asc': { price: 1 },
  'price-desc': { price: -1 },
  rating: { ratingAverage: -1, reviewCount: -1 },
  'best-selling': { unitsSold: -1, ratingAverage: -1 },
};

const PUBLIC_POPULATE = { path: 'vendor', select: 'name slug logo location ratingAverage' };

/** Builds the marketplace filter from a validated query string. */
async function buildProductFilter(query) {
  const filter = { isActive: true, isArchived: false };

  if (query.category) filter.category = String(query.category).toLowerCase();
  if (query.tag) filter.tags = String(query.tag).toLowerCase();
  if (query.featured === 'true') filter.isFeatured = true;
  if (query.inStock === 'true') filter.stock = { $gt: 0 };
  if (query.minRating) filter.ratingAverage = { $gte: Number(query.minRating) };

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filter.price = {};
    if (query.minPrice !== undefined) filter.price.$gte = Number(query.minPrice);
    if (query.maxPrice !== undefined) filter.price.$lte = Number(query.maxPrice);
  }

  if (query.vendor) {
    const store = await Store.findOne({ slug: String(query.vendor).toLowerCase() }).select('_id');
    filter.vendor = store?._id || null;
  }

  if (query.q) {
    const words = searchWords(query.q);
    if (words.length === 0) return filter;

    /* Every word must match something, and each word may match any field.
       ANDing the words is what a shopper expects: adding a word should narrow
       the results, not widen them the way an OR would. */
    const anyWord = searchRegex(query.q);
    const candidateStores = await Store.find({ name: anyWord, isActive: true })
      .select('_id name')
      .lean();

    filter.$and = words.map((word) => {
      const rx = wordRegex(word);
      // Shop names count too, so "Terra vase" finds that studio's vases.
      const storeIds = candidateStores.filter((store) => rx.test(store.name)).map((s) => s._id);
      return {
        $or: [
          { name: rx },
          { description: rx },
          { tags: rx },
          { category: rx },
          { vendor: { $in: storeIds } },
        ],
      };
    });
  }

  return filter;
}

export const listProducts = asyncHandler(async (req, res) => {
  const query = req.validatedQuery || req.query;
  const { page, limit, skip } = getPagination(query, { defaultLimit: 12, maxLimit: 60 });
  const filter = await buildProductFilter(query);
  const sort = SORTS[query.sort] || SORTS.featured;

  const [products, total] = await Promise.all([
    Product.find(filter).populate(PUBLIC_POPULATE).sort(sort).skip(skip).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    message: 'Products',
    data: products,
    meta: { ...buildMeta({ page, limit, total }), sort: query.sort || 'featured' },
  });
});

/** Accepts either a slug or an id so links stay friendly but ids still work. */
export const getProduct = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;
  const criteria = /^[0-9a-fA-F]{24}$/.test(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };

  const product = await Product.findOne({ ...criteria, isArchived: false }).populate(PUBLIC_POPULATE);
  if (!product || (!product.isActive && req.user?.role !== 'admin')) {
    throw ApiError.notFound('That product is no longer available');
  }

  const related = await Product.find({
    _id: { $ne: product._id },
    category: product.category,
    isActive: true,
    isArchived: false,
  })
    .populate(PUBLIC_POPULATE)
    .sort({ ratingAverage: -1, unitsSold: -1 })
    .limit(4)
    .lean();

  return sendSuccess(res, { message: product.name, data: { product, related } });
});

export const listCategories = asyncHandler(async (_req, res) => {
  const categories = await Category.find({ isActive: true }).sort({ displayOrder: 1 }).lean();
  const counts = await Product.aggregate([
    { $match: { isActive: true, isArchived: false } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [c._id, c.count]));
  return sendSuccess(res, {
    message: 'Categories',
    data: categories.map((c) => ({ ...c, productCount: countMap.get(c.slug) || 0 })),
  });
});

/* ------------------------------------------------------------------ *
 * Vendor-owned product management                                     *
 * ------------------------------------------------------------------ */

async function assertCategoryExists(slug) {
  const exists = await Category.exists({ slug, isActive: true });
  if (!exists) throw ApiError.badRequest('Pick one of the marketplace categories');
}

/** Loads a product the caller is allowed to change, or throws. */
async function findOwnedProduct(req) {
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound('Product not found');
  const isOwner = String(product.vendor) === String(req.store?._id);
  if (!isOwner && req.user.role !== 'admin') {
    throw ApiError.forbidden('This product belongs to another shop');
  }
  return product;
}

export const createProduct = asyncHandler(async (req, res) => {
  await assertCategoryExists(req.body.category);

  const slug = await uniqueSlug(req.body.name, async (candidate) =>
    Boolean(await Product.exists({ slug: candidate }))
  );

  const product = await Product.create({
    ...req.body,
    compareAtPrice: req.body.compareAtPrice || null,
    tags: (req.body.tags || []).map((tag) => tag.toLowerCase()),
    slug,
    // Ownership always comes from the session, never from the request body.
    vendor: req.store._id,
    vendorUser: req.user._id,
  });

  return sendSuccess(res, {
    statusCode: 201,
    message: `"${product.name}" is now listed`,
    data: { product },
  });
});

export const listMyProducts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 20, maxLimit: 100 });
  const filter = { vendor: req.store._id };

  if (req.query.status === 'active') Object.assign(filter, { isActive: true, isArchived: false });
  if (req.query.status === 'draft') Object.assign(filter, { isActive: false, isArchived: false });
  if (req.query.status === 'archived') filter.isArchived = true;
  if (req.query.status === undefined || req.query.status === 'all') filter.isArchived = false;
  if (req.query.category) filter.category = String(req.query.category).toLowerCase();
  if (req.query.q) {
    // Same AND semantics as the public search: more words means fewer results.
    const words = searchWords(req.query.q);
    if (words.length) filter.$and = words.map((word) => ({ name: wordRegex(word) }));
  }

  const [products, total] = await Promise.all([
    Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    message: 'Your products',
    data: products,
    meta: buildMeta({ page, limit, total }),
  });
});

export const getMyProduct = asyncHandler(async (req, res) => {
  const product = await findOwnedProduct(req);
  return sendSuccess(res, { message: product.name, data: { product } });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await findOwnedProduct(req);
  if (req.body.category) await assertCategoryExists(req.body.category);

  const updatable = [
    'name',
    'description',
    'price',
    'compareAtPrice',
    'category',
    'stock',
    'sku',
    'tags',
    'images',
    'isActive',
  ];
  for (const field of updatable) {
    if (req.body[field] !== undefined) product[field] = req.body[field];
  }
  if (req.body.tags) product.tags = req.body.tags.map((tag) => tag.toLowerCase());
  if (req.body.compareAtPrice === 0) product.compareAtPrice = null;

  if (req.body.name && req.body.name !== product.name) {
    product.slug = await uniqueSlug(req.body.name, async (candidate) =>
      Boolean(await Product.exists({ slug: candidate, _id: { $ne: product._id } }))
    );
  }

  await product.save();
  return sendSuccess(res, { message: 'Product updated', data: { product } });
});

/**
 * Products that appear in an order are archived rather than deleted, so past
 * orders keep resolving. Only never-sold products are removed outright.
 */
export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await findOwnedProduct(req);
  const hasOrders = await Order.exists({ 'items.product': product._id });

  if (hasOrders) {
    product.isArchived = true;
    product.isActive = false;
    product.archivedAt = new Date();
    await product.save();
    return sendSuccess(res, {
      message: `"${product.name}" was archived - it appears in past orders`,
      data: { product, archived: true },
    });
  }

  await Promise.all(product.images.map((image) => destroyImage(image.publicId)));
  await product.deleteOne();
  return sendSuccess(res, {
    message: `"${product.name}" was deleted`,
    data: { id: product._id, archived: false },
  });
});

export const restoreProduct = asyncHandler(async (req, res) => {
  const product = await findOwnedProduct(req);
  product.isArchived = false;
  product.archivedAt = null;
  await product.save();
  return sendSuccess(res, { message: 'Product restored', data: { product } });
});
