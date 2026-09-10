/**
 * Seeds a complete, demonstrable marketplace: categories, an admin, six
 * artisan shops, 30 products, a spread of paid orders across the last 90 days
 * (with real commission/payout records) and verified reviews.
 *
 *   npm run seed            # wipe and reseed
 *   npm run seed:destroy    # wipe only
 */
import mongoose from 'mongoose';
import { pathToFileURL } from 'node:url';
import env from '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { CATEGORY_SEED } from '../config/categories.js';
import Category from '../models/Category.js';
import Order from '../models/Order.js';
import Payout from '../models/Payout.js';
import Product from '../models/Product.js';
import Review from '../models/Review.js';
import Store from '../models/Store.js';
import User from '../models/User.js';
import { buildCheckoutQuote } from '../services/pricing.service.js';
import { finalizePaidOrder } from '../services/order.service.js';
import { slugify } from '../utils/slugify.js';
import { ADMIN, BUYERS, PRODUCTS, STORES, productArt, storeArt } from './data.js';

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const pickSome = (list, count) => [...list].sort(() => Math.random() - 0.5).slice(0, count);

const ADDRESSES = [
  { fullName: 'Ava Thompson', addressLine1: '14 Rosewood Lane', addressLine2: 'Apt 3B', city: 'Brooklyn', state: 'New York', postalCode: '11215', country: 'United States', phone: '+1 917 555 0143' },
  { fullName: 'Noah Bennett', addressLine1: '8 Fitzroy Terrace', addressLine2: '', city: 'Melbourne', state: 'Victoria', postalCode: '3065', country: 'Australia', phone: '+61 3 5550 1188' },
  { fullName: 'Priya Raman', addressLine1: '221 Brigade Road', addressLine2: 'Flat 12', city: 'Bengaluru', state: 'Karnataka', postalCode: '560025', country: 'India', phone: '+91 98450 33112' },
];

const REVIEW_POOL = [
  { rating: 5, title: 'Even better in person', comment: 'The photographs do not quite catch the depth of the glaze. It arrived wrapped beautifully and has not left my table since.' },
  { rating: 5, title: 'Worth every penny', comment: 'You can feel that a person made this. Small marks from the maker\u2019s hands here and there, which is exactly what I wanted.' },
  { rating: 4, title: 'Lovely, slightly smaller than expected', comment: 'Really well made and the finish is beautiful. Check the measurements twice - it is a little smaller than I pictured, but I am keeping it.' },
  { rating: 5, title: 'Bought a second one', comment: 'Gave the first as a gift and immediately ordered another for myself. Shipping was quick and the seller sent a handwritten note.' },
  { rating: 4, title: 'Great craftsmanship', comment: 'Solid, careful work. Took a little longer to arrive than I hoped but the quality made up for it.' },
  { rating: 5, title: 'Exactly what I was looking for', comment: 'I have been hunting for something like this for months. Beautifully finished and clearly built to last.' },
];

async function wipe() {
  await Promise.all([
    Category.deleteMany({}),
    Order.deleteMany({}),
    Payout.deleteMany({}),
    Product.deleteMany({}),
    Review.deleteMany({}),
    Store.deleteMany({}),
    User.deleteMany({}),
  ]);
  console.log('[seed] collections cleared');
}

/** Backdates a document past Mongoose timestamps so charts have real history. */
async function backdate(model, id, date) {
  await model.collection.updateOne(
    { _id: new mongoose.Types.ObjectId(String(id)) },
    { $set: { createdAt: date, updatedAt: date } }
  );
}

async function seedCategories() {
  await Category.insertMany(CATEGORY_SEED);
  console.log(`[seed] ${CATEGORY_SEED.length} categories`);
}

async function seedPeopleAndStores() {
  const admin = await User.create({ ...ADMIN, role: 'admin' });

  const buyers = [];
  for (const buyer of BUYERS) {
     
    buyers.push(await User.create({ ...buyer, role: 'buyer' }));
     
  }

  const storesByKey = new Map();
  for (const definition of STORES) {
     
    const owner = await User.create({ ...definition.owner, role: 'vendor' });
    const store = await Store.create({
      owner: owner._id,
      name: definition.name,
      slug: slugify(definition.name),
      tagline: definition.tagline,
      description: definition.description,
      location: definition.location,
      logo: storeArt(definition.key).logo,
      banner: storeArt(definition.key).banner,
      contactEmail: definition.owner.email,
      contactPhone: '+1 555 0100',
      isActive: true,
    });
    owner.store = store._id;
    await owner.save();
    storesByKey.set(definition.key, { store, owner });
     
  }

  console.log(`[seed] 1 admin, ${buyers.length} buyers, ${storesByKey.size} vendors + stores`);
  return { admin, buyers, storesByKey };
}

async function seedProducts(storesByKey) {
  const products = [];
  for (const item of PRODUCTS) {
    const entry = storesByKey.get(item.store);
     
    const product = await Product.create({
      name: item.name,
      slug: slugify(item.name),
      description: item.description,
      price: item.price,
      compareAtPrice: item.compareAtPrice,
      category: item.category,
      images: productArt(item.name),
      vendor: entry.store._id,
      vendorUser: entry.owner._id,
      stock: item.stock,
      sku: `${item.store.toUpperCase()}-${slugify(item.name).slice(0, 12).toUpperCase()}`,
      tags: item.tags,
      isFeatured: Boolean(item.featured),
      isActive: true,
    });
    await backdate(Product, product._id, daysAgo(Math.floor(Math.random() * 120) + 5));
    products.push(product);
     
  }
  console.log(`[seed] ${products.length} products`);
  return products;
}

/** Builds one paid order through the real pricing + payout pipeline. */
async function seedOneOrder(buyer, address, when) {
  /* Re-read live stock so the seeded orders never oversell, and leave the
     scarce pieces alone: one-of-a-kind items should still be in stock for
     someone browsing the demo, rather than sold out by the seeder. */
  const available = await Product.find({ stock: { $gte: 6 }, isActive: true })
    .select('_id')
    .lean();
  if (available.length === 0) return null;

  const chosen = pickSome(available, Math.random() > 0.55 ? 3 : Math.random() > 0.4 ? 2 : 1);
  const items = chosen.map((product) => ({
    productId: String(product._id),
    quantity: Math.random() > 0.85 ? 2 : 1,
  }));

  const quote = await buildCheckoutQuote(items);
  const order = await Order.create({
    buyer: buyer._id,
    items: quote.lineItems,
    vendors: quote.vendors,
    shippingAddress: address,
    subtotal: quote.totals.subtotal,
    shippingCost: quote.totals.shippingCost,
    tax: quote.totals.tax,
    total: quote.totals.total,
    currency: quote.totals.currency,
    commissionRate: quote.totals.commissionRate,
    platformFee: quote.totals.platformFee,
    vendorEarnings: quote.totals.vendorEarnings,
    paymentProvider: 'mock',
    paymentStatus: 'pending',
    orderStatus: 'pending_payment',
  });

  await finalizePaidOrder(order, { paymentIntentId: `mock_pi_seed_${order._id}` });

  // Age the order so the analytics charts show a believable history.
  const age = Math.floor((Date.now() - when.getTime()) / (24 * 60 * 60 * 1000));
  const status = age > 12 ? 'delivered' : age > 6 ? 'shipped' : age > 2 ? 'confirmed' : 'processing';
  order.items.forEach((item) => {
    item.fulfillmentStatus = status;
    if (['shipped', 'delivered'].includes(status)) {
      item.trackingNumber = `AC${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    }
  });
  order.orderStatus = status;
  order.paidAt = when;
  await order.save();

  await Order.collection.updateOne(
    { _id: order._id },
    { $set: { createdAt: when, updatedAt: when, paidAt: when } }
  );
  await Payout.collection.updateMany(
    { order: order._id },
    { $set: { createdAt: when, updatedAt: when } }
  );

  return { order, status };
}

async function seedOrdersAndReviews(buyers) {
  const orders = [];
  /* Enough orders, weighted towards recent days, that the analytics charts read
     like a working marketplace rather than three isolated spikes. */
  for (let i = 0; i < 90; i += 1) {
    const buyer = buyers[i % buyers.length];
    const address = ADDRESSES[i % ADDRESSES.length];
    const when = daysAgo(Math.floor(Math.random() ** 1.5 * 110) + 1);
     
    const seeded = await seedOneOrder(buyer, { ...address, fullName: buyer.name }, when);
    if (seeded) orders.push(seeded);
  }
  console.log(`[seed] ${orders.length} paid orders with commission + payout records`);

  /* Every delivered line a buyer could review, deduped: one review per buyer
     per product is all the API allows. */
  const seen = new Set();
  const eligible = [];
  for (const { order, status } of orders) {
    if (status !== 'delivered') continue;
    for (const item of order.items) {
      const key = `${order.buyer}-${item.product}`;
      if (seen.has(key)) continue;
      seen.add(key);
      eligible.push({ order, item });
    }
  }

  const writeReview = async ({ order, item }) => {
    const template = pick(REVIEW_POOL);
    await Review.create({
      product: item.product,
      user: order.buyer,
      order: order._id,
      rating: template.rating,
      title: template.title,
      comment: template.comment,
    });

    /* Flag the line item exactly as the API does when a buyer reviews for
       real. Without this the order page keeps offering "Write a review" for a
       piece that has already been reviewed, and the API then refuses it. */
    await Order.updateOne(
      { _id: order._id, 'items.product': item.product },
      { $set: { 'items.$[line].reviewed': true } },
      { arrayFilters: [{ 'line.product': item.product }] }
    );

    await Review.recalculateProductRating(item.product);
  };

  /* The demo buyer is the account a reviewer of this project signs in as, so
     their history is not left to chance: one piece already reviewed, and one
     still waiting to be. Everyone else is sprinkled randomly. */
  const demoBuyer = String(buyers[0]._id);
  const demoLines = eligible.filter((entry) => String(entry.order.buyer) === demoBuyer);
  const alwaysReview = demoLines.length > 1 ? demoLines[0] : null;
  /* Held back so the "Write a review" path always has something to offer. */
  const heldBack = demoLines.length > 1 ? demoLines[demoLines.length - 1] : null;

  let reviewCount = 0;
  for (const entry of eligible) {
    if (entry === heldBack) continue;
    if (entry !== alwaysReview && Math.random() > 0.75) continue;
    await writeReview(entry);
    reviewCount += 1;
  }

  console.log(`[seed] ${reviewCount} verified reviews`);
}

export async function run() {
  const destroyOnly = process.argv.includes('--destroy');

  await connectDB();
  console.log(`[seed] target database: ${mongoose.connection.name}`);
  await wipe();

  if (destroyOnly) {
    await disconnectDB();
    console.log('[seed] done - database emptied');
    return;
  }

  await seedCategories();
  const { buyers, storesByKey } = await seedPeopleAndStores();
  await seedProducts(storesByKey);
  await seedOrdersAndReviews(buyers);

  console.log('\nDemo accounts');
  console.log('  Admin   admin@artisanscorner.demo   / DemoAdmin123!');
  console.log('  Vendor  vendor@artisanscorner.demo  / DemoVendor123!  (Terra & Thread)');
  console.log('  Buyer   buyer@artisanscorner.demo   / DemoBuyer123!');
  console.log(`\nCommission rate in use: ${(env.commissionRate * 100).toFixed(1)}%`);

  await disconnectDB();
  console.log('[seed] done');
}

// Only self-execute when run directly (`npm run seed`); importing just
// exposes `run` so the in-memory dev server can seed before it boots.
const isEntryPoint = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntryPoint) {
  run().catch(async (error) => {
    console.error('[seed] failed:', error);
    await disconnectDB().catch(() => {});
    process.exit(1);
  });
}
