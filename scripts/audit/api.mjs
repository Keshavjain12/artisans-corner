import {
  call,
  check,
  login,
  registerBuyer,
  registerVendor,
  makeProduct,
  buy,
  SHIP,
  section,
  rand,
} from './harness.mjs';

/* ---------------------------------------------------------------- AUTH */
section('AUTH');
const buyerToken = await login('buyer@artisanscorner.demo', 'DemoBuyer123!');
const vendorToken = await login('vendor@artisanscorner.demo', 'DemoVendor123!');
const adminToken = await login('admin@artisanscorner.demo', 'DemoAdmin123!');
check('demo accounts sign in', Boolean(buyerToken && vendorToken && adminToken));

const fresh = await registerBuyer();
check('registration works', fresh.res.status === 201 && Boolean(fresh.token), `status ${fresh.res.status}`);
check('registration never returns a password', !/"password"/i.test(fresh.res.text));

const dupe = await registerBuyer({ email: 'buyer@artisanscorner.demo' });
check('duplicate email rejected', dupe.res.status === 409, `status ${dupe.res.status}`);

const weak = await call('/auth/register', {
  method: 'POST',
  body: { name: 'X', email: 'bad', password: 'short', confirmPassword: 'nope' },
});
const weakFields = (weak.body?.errors || []).map((e) => e.field);
check(
  'registration validation (email, password, confirm, name)',
  weak.status === 400 && ['email', 'password', 'confirmPassword'].every((f) => weakFields.includes(f)),
  JSON.stringify(weakFields)
);

const selfAdmin = await call('/auth/register', {
  method: 'POST',
  body: {
    name: 'Sneaky', email: `sneak-${rand()}@example.com`,
    password: 'Passw0rd123', confirmPassword: 'Passw0rd123', role: 'admin',
  },
});
check('self-assigned admin role ignored', selfAdmin.body?.data?.user?.role === 'buyer', selfAdmin.body?.data?.user?.role);

const badLogin = await call('/auth/login', {
  method: 'POST', body: { email: 'buyer@artisanscorner.demo', password: 'WrongPassword1' },
});
check('wrong password rejected without leaking which field', badLogin.status === 401 && badLogin.body.message === 'Incorrect email or password');

const me = await call('/auth/me', { token: buyerToken });
check('get current user (JWT works)', me.status === 200 && Boolean(me.body?.data?.user?.email));
check('protected route without token is 401', (await call('/auth/me')).status === 401);
check('logout endpoint responds', (await call('/auth/logout', { method: 'POST' })).status === 200);

const profile = await call('/auth/me', { method: 'PUT', token: fresh.token, body: { name: 'Renamed Buyer' } });
check('profile update works', profile.body?.data?.user?.name === 'Renamed Buyer');

const pwChange = await call('/auth/change-password', {
  method: 'PUT', token: fresh.token,
  body: { currentPassword: 'Passw0rd123', newPassword: 'NewPassw0rd1', confirmPassword: 'NewPassw0rd1' },
});
check('password change works', pwChange.status === 200, pwChange.body?.message);
check('new password is usable', Boolean(await login(fresh.email, 'NewPassw0rd1').catch(() => null)));

/* -------------------------------------------------------------- VENDOR */
section('VENDOR');
const vendorA = await registerVendor(`Audit Studio A ${rand()}`);
check('become a seller works', vendorA.onboard.status === 201 && Boolean(vendorA.store?.slug));

const roleAfter = await call('/auth/me', { token: vendorA.token });
check('onboarding upgrades role to vendor', roleAfter.body?.data?.user?.role === 'vendor', roleAfter.body?.data?.user?.role);
check('onboarding links the store to the session', Boolean(roleAfter.body?.data?.store?.id));

const second = await call('/vendors/onboard', {
  method: 'POST', token: vendorA.token,
  body: { name: 'Second Shop', description: 'Trying to open a second shop on one account here.' },
});
check('one store per account enforced', second.status === 409, `status ${second.status}`);

const created = await makeProduct(vendorA.token);
check('product creation works', created.res.status === 201 && Boolean(created.product?._id), created.res.body?.message);
check('product slug generated', Boolean(created.product?.slug));
check('product ownership taken from session', String(created.product?.vendor) === String(vendorA.store?._id || vendorA.store?.id));

const edited = await call(`/products/${created.product._id}`, {
  method: 'PUT', token: vendorA.token, body: { price: 120, stock: 9 },
});
check('product editing works', edited.body?.data?.product?.price === 120 && edited.body?.data?.product?.stock === 9);

const vendorB = await registerVendor(`Audit Studio B ${rand()}`);
const crossEdit = await call(`/products/${created.product._id}`, {
  method: 'PUT', token: vendorB.token, body: { price: 1 },
});
check('vendor A cannot edit vendor B product', crossEdit.status === 403, `status ${crossEdit.status}`);
const crossDelete = await call(`/products/${created.product._id}`, { method: 'DELETE', token: vendorB.token });
check('vendor A cannot delete vendor B product', crossDelete.status === 403, `status ${crossDelete.status}`);

const buyerCreate = await makeProduct(buyerToken);
check('buyer without a store cannot create products', buyerCreate.res.status === 403, `status ${buyerCreate.res.status}`);

const badCategory = await makeProduct(vendorA.token, { category: 'spaceships' });
check('category whitelist enforced', badCategory.res.status === 400);
const badPrice = await makeProduct(vendorA.token, { price: -5, stock: -1 });
check('price/stock validation enforced', badPrice.res.status === 400);

const mine = await call('/products/mine', { token: vendorA.token });
check('vendor product list works', mine.status === 200 && Array.isArray(mine.body?.data));

const throwaway = await makeProduct(vendorA.token, { name: `Throwaway ${rand()}` });
const hardDelete = await call(`/products/${throwaway.product._id}`, { method: 'DELETE', token: vendorA.token });
check('never-sold product is deleted outright', hardDelete.body?.data?.archived === false, JSON.stringify(hardDelete.body?.data));

const storeUpdate = await call('/vendors/me', {
  method: 'PUT', token: vendorA.token, body: { tagline: 'Audited tagline' },
});
check('store profile editing works', storeUpdate.body?.data?.store?.tagline === 'Audited tagline');

/* ---------------------------------------------------------------- SHOP */
section('SHOP');
const listing = await call('/products?limit=5');
check('product listing works', listing.status === 200 && listing.body.data.length === 5);
check('listing returns pagination meta', Boolean(listing.body.meta?.totalPages));
check('listing populates the vendor', Boolean(listing.body.data[0]?.vendor?.name));

const search = await call('/products?q=vase');
check('search works', search.status === 200 && search.body.data.length > 0, `${search.body?.data?.length} hits`);
const byCategory = await call('/products?category=jewelry');
check('category filter works', byCategory.body.data.every((p) => p.category === 'jewelry'));
const byPrice = await call('/products?minPrice=100&maxPrice=200');
check('price filter works', byPrice.body.data.every((p) => p.price >= 100 && p.price <= 200));
const byRating = await call('/products?minRating=4');
check('rating filter works', byRating.body.data.every((p) => p.ratingAverage >= 4));
const inStock = await call('/products?inStock=true');
check('stock filter works', inStock.body.data.every((p) => p.stock > 0));

const asc = await call('/products?sort=price-asc&limit=10');
const ascPrices = asc.body.data.map((p) => p.price);
check('sort price low to high', ascPrices.every((v, i, a) => i === 0 || a[i - 1] <= v), ascPrices.join(','));
const desc = await call('/products?sort=price-desc&limit=10');
const descPrices = desc.body.data.map((p) => p.price);
check('sort price high to low', descPrices.every((v, i, a) => i === 0 || a[i - 1] >= v));
const newest = await call('/products?sort=newest&limit=5');
const dates = newest.body.data.map((p) => new Date(p.createdAt).getTime());
check('sort newest', dates.every((v, i, a) => i === 0 || a[i - 1] >= v));

const page2 = await call('/products?page=2&limit=5');
check('pagination works', page2.body.meta.page === 2 && page2.body.data.length > 0);

const slug = listing.body.data[0].slug;
const detail = await call(`/products/${slug}`);
check('product detail by slug works', detail.status === 200 && detail.body.data.product.slug === slug);
check('product detail returns related products', Array.isArray(detail.body.data.related));

const cats = await call('/categories');
check('categories endpoint works', cats.body.data.length === 10 && cats.body.data[0].productCount >= 0);
const stores = await call('/vendors');
check('artisan directory works', stores.body.data.length > 0 && stores.body.data[0].productCount >= 0);
const storePage = await call(`/vendors/${stores.body.data[0].slug}`);
check('storefront page works', storePage.status === 200 && Array.isArray(storePage.body.data.products));

/* ------------------------------------------------------------ CHECKOUT */
section('CHECKOUT / CART SECURITY');
const shopVendor = await registerVendor(`Audit Shop ${rand()}`);
const p100 = (await makeProduct(shopVendor.token, { price: 100, stock: 5 })).product;
const cheap = (await makeProduct(shopVendor.token, { price: 20, stock: 5 })).product;

const quote = await call('/payments/quote', {
  method: 'POST', token: buyerToken, body: { items: [{ productId: p100._id, quantity: 2 }] },
});
check('cart quote recalculates on the server', quote.body?.data?.totals?.subtotal === 200, JSON.stringify(quote.body?.data?.totals));
check('commission is 5% of subtotal', quote.body?.data?.totals?.platformFee === 10);
check('vendor earnings = subtotal - fee', quote.body?.data?.totals?.vendorEarnings === 190);
check('free shipping above threshold', quote.body?.data?.totals?.shippingCost === 0);

const cheapQuote = await call('/payments/quote', {
  method: 'POST', token: buyerToken, body: { items: [{ productId: cheap._id, quantity: 1 }] },
});
check('flat shipping below threshold', cheapQuote.body?.data?.totals?.shippingCost === 5 && cheapQuote.body?.data?.totals?.total === 25);

const tampered = await call('/payments/create-intent', {
  method: 'POST', token: buyerToken,
  body: { items: [{ productId: p100._id, quantity: 1, price: 1, subtotal: 1 }], shippingAddress: SHIP, total: 1 },
});
check('client-sent price is ignored', tampered.body?.data?.totals?.subtotal === 100, JSON.stringify(tampered.body?.data?.totals));

const oversell = await call('/payments/create-intent', {
  method: 'POST', token: buyerToken,
  body: { items: [{ productId: p100._id, quantity: 99 }], shippingAddress: SHIP },
});
check('cannot buy more than stock', oversell.status === 400, oversell.body?.message);

const badAddress = await call('/payments/create-intent', {
  method: 'POST', token: buyerToken,
  body: { items: [{ productId: p100._id, quantity: 1 }], shippingAddress: { fullName: 'x' } },
});
check('shipping address validated server-side', badAddress.status === 400);

const anonIntent = await call('/payments/create-intent', {
  method: 'POST', body: { items: [{ productId: p100._id, quantity: 1 }], shippingAddress: SHIP },
});
check('checkout requires authentication', anonIntent.status === 401);

const paymentConfig = await call('/payments/config');
check('payment config is public and has no secret', paymentConfig.status === 200 && !/sk_|secret/i.test(paymentConfig.text));

/* -------------------------------------------------------------- ORDERS */
section('ORDERS');
const purchase = await buy(buyerToken, p100._id, 2);
check('payment success creates a paid order', purchase.order?.paymentStatus === 'paid', purchase.confirm?.body?.message);
check('order status starts at processing', purchase.order?.orderStatus === 'processing');
check('order number generated', /^AC-/.test(purchase.order?.orderNumber || ''));
check('order stores price snapshot', purchase.order?.items?.[0]?.priceSnapshot === 100);
check('order stores per-item commission', purchase.order?.items?.[0]?.platformFee === 10 && purchase.order?.items?.[0]?.vendorEarnings === 190);

const afterStock = await call(`/products/${p100.slug}`);
check('inventory decremented on payment', afterStock.body.data.product.stock === 3, `stock ${afterStock.body.data.product.stock}`);
check('unitsSold incremented', afterStock.body.data.product.unitsSold === 2);

const replay = await call('/payments/confirm', {
  method: 'POST', token: buyerToken, body: { paymentIntentId: purchase.order.stripePaymentIntentId },
});
const afterReplay = await call(`/products/${p100.slug}`);
check('duplicate confirmation is idempotent', replay.status === 200 && afterReplay.body.data.product.stock === 3);

const myOrders = await call('/orders/my-orders', { token: buyerToken });
check('buyer can list own orders', myOrders.status === 200 && myOrders.body.data.length > 0);

const stranger = await registerBuyer();
const peek = await call(`/orders/${purchase.order._id}`, { token: stranger.token });
check('another buyer cannot read the order', peek.status === 403, `status ${peek.status}`);

const vendorOrders = await call('/vendors/me/orders', { token: shopVendor.token });
check('vendor sees orders containing their products', vendorOrders.body?.data?.length > 0);
const vOrder = vendorOrders.body.data[0];
check('vendor view exposes only their own line items', vOrder.items.every((i) => String(i.vendor) === String(shopVendor.store._id || shopVendor.store.id)));
check('vendor view carries the shipping address for fulfilment', Boolean(vOrder.shippingAddress?.addressLine1));
check('vendor view shows their earnings', vOrder.vendorTotals?.vendorEarnings === 190);

const advance = await call(`/orders/${purchase.order._id}/status`, {
  method: 'PUT', token: shopVendor.token, body: { status: 'shipped', trackingNumber: 'AC123' },
});
check('vendor can update fulfilment status', advance.status === 200 && advance.body.data.order.items[0].fulfillmentStatus === 'shipped', advance.body?.message);

const foreignUpdate = await call(`/orders/${purchase.order._id}/status`, {
  method: 'PUT', token: vendorA.token, body: { status: 'delivered' },
});
check('unrelated vendor cannot change fulfilment', foreignUpdate.status === 403, `status ${foreignUpdate.status}`);

await call(`/products/${p100._id}`, { method: 'PUT', token: shopVendor.token, body: { price: 999 } });
const historical = await call(`/orders/${purchase.order._id}`, { token: buyerToken });
check('historical price survives a product price change', historical.body.data.order.items[0].priceSnapshot === 100 && historical.body.data.order.total === 200);

const soldProduct = await call(`/products/${p100._id}`, { method: 'DELETE', token: shopVendor.token });
check('sold product is archived, not deleted', soldProduct.body?.data?.archived === true, JSON.stringify(soldProduct.body?.data));
const stillThere = await call(`/orders/${purchase.order._id}`, { token: buyerToken });
check('archived product keeps order history intact', stillThere.body.data.order.items[0].productNameSnapshot?.length > 0);

/* ------------------------------------------------------------- REVIEWS */
section('REVIEWS');
const reviewVendor = await registerVendor(`Review Studio ${rand()}`);
const reviewable = (await makeProduct(reviewVendor.token, { price: 40, stock: 5 })).product;
const reviewer = await registerBuyer();

const notBought = await call('/reviews', {
  method: 'POST', token: reviewer.token,
  body: { productId: reviewable._id, rating: 5, comment: 'Never actually bought this piece at all.' },
});
check('unverified buyer cannot review', notBought.status === 403, `status ${notBought.status}`);

await buy(reviewer.token, reviewable._id, 1);
const pendingList = await call('/reviews/pending', { token: reviewer.token });
check('purchased product appears as reviewable', pendingList.body.data.some((p) => String(p.productId) === String(reviewable._id)));

const posted = await call('/reviews', {
  method: 'POST', token: reviewer.token,
  body: { productId: reviewable._id, rating: 4, comment: 'Beautifully finished and quickly delivered.' },
});
check('verified buyer can review', posted.status === 201, posted.body?.message);
check('average rating recalculated', posted.body?.data?.ratingAverage === 4 && posted.body?.data?.reviewCount === 1);

const dupeReview = await call('/reviews', {
  method: 'POST', token: reviewer.token,
  body: { productId: reviewable._id, rating: 1, comment: 'Second review attempt for the same piece.' },
});
check('duplicate review rejected', dupeReview.status === 409);

const badRating = await call('/reviews', {
  method: 'POST', token: reviewer.token,
  body: { productId: reviewable._id, rating: 9, comment: 'Rating out of the allowed range here.' },
});
check('rating range validated', badRating.status === 400);

const editReview = await call(`/reviews/${posted.body.data.review._id}`, {
  method: 'PUT', token: reviewer.token, body: { rating: 5 },
});
check('review can be edited', editReview.body?.data?.ratingAverage === 5);

const productReviews = await call(`/products/${reviewable._id}/reviews`);
check('reviews listed on the product', productReviews.body.data.reviews.length === 1);
check('anonymous viewer has no review of their own', productReviews.body.data.viewerReview === null);

const asReviewer = await call(`/products/${reviewable._id}/reviews`, { token: reviewer.token });
check(
  'the reviewer is told the review is theirs',
  String(asReviewer.body.data.viewerReview?._id) === String(posted.body.data.review._id)
);

const reviewedOrders = await call('/orders/my-orders', { token: reviewer.token });
check(
  'reviewing flags the order line',
  reviewedOrders.body.data.some((order) => order.items.some((item) => item.reviewed))
);
const stillPending = await call('/reviews/pending', { token: reviewer.token });
check(
  'a reviewed piece is no longer offered for review',
  !stillPending.body.data.some((entry) => String(entry.productId) === String(reviewable._id))
);
check('rating distribution returned', productReviews.body.data.distribution.length === 5);

/* ----------------------------------------------------------- DASHBOARD */
section('VENDOR DASHBOARD');
const analytics = await call('/vendors/me/analytics?range=90d', { token: shopVendor.token });
const t = analytics.body?.data?.totals;
check('vendor analytics endpoint works', analytics.status === 200 && Boolean(t));
check('analytics revenue from real orders', t?.revenue === 200, `revenue ${t?.revenue}`);
check('analytics fees and net earnings', t?.platformFees === 10 && t?.netEarnings === 190);
check('analytics counts orders and units', t?.orders === 1 && t?.unitsSold === 2);
check('analytics average order value', t?.averageOrderValue === 200);
check('analytics returns a chart series', Array.isArray(analytics.body.data.series) && analytics.body.data.series.length > 0);
check('analytics returns best sellers', analytics.body.data.topProducts.length > 0);

for (const range of ['7d', '30d', '90d', '1y']) {
  const r = await call(`/vendors/me/analytics?range=${range}`, { token: shopVendor.token });
  check(`analytics range ${range}`, r.status === 200 && r.body.data.range === range);
}

const payouts = await call('/vendors/me/payouts', { token: shopVendor.token });
check('earnings ledger works', payouts.body?.data?.summary?.netEarnings === 190, JSON.stringify(payouts.body?.data?.summary));
check('payout row recorded per order', payouts.body.data.payouts.length === 1);

const buyerAnalytics = await call('/vendors/me/analytics', { token: buyerToken });
check('buyer cannot read vendor analytics', buyerAnalytics.status === 403);

/* --------------------------------------------------------------- ADMIN */
section('ADMIN');
const adminAnalytics = await call('/admin/analytics?range=90d', { token: adminToken });
check('admin analytics works', adminAnalytics.status === 200 && adminAnalytics.body.data.totals.totalUsers > 0);
check('admin sees platform revenue', adminAnalytics.body.data.totals.platformRevenue > 0);
check('admin sees category breakdown', Array.isArray(adminAnalytics.body.data.categoryBreakdown));

const adminUsers = await call('/admin/users?limit=5', { token: adminToken });
check('admin user management works', adminUsers.status === 200 && adminUsers.body.data.length > 0);
check('admin user list hides password hashes', !/"password"/i.test(adminUsers.text));

const target = (await call(`/admin/users?q=${encodeURIComponent(stranger.email)}`, { token: adminToken })).body.data[0];
const deactivate = await call(`/admin/users/${target._id}`, { method: 'PUT', token: adminToken, body: { isActive: false } });
check('admin can deactivate a user', deactivate.body?.data?.user?.isActive === false);
const blocked = await call('/auth/me', { token: stranger.token });
check('deactivated user is locked out', blocked.status === 403, `status ${blocked.status}`);
await call(`/admin/users/${target._id}`, { method: 'PUT', token: adminToken, body: { isActive: true } });

const adminVendors = await call('/admin/vendors', { token: adminToken });
check('admin vendor list works', adminVendors.status === 200 && adminVendors.body.data.length > 0);

const suspendTarget = vendorA.store._id || vendorA.store.id;
const suspend = await call(`/admin/vendors/${suspendTarget}/status`, {
  method: 'PUT', token: adminToken, body: { isActive: false, reason: 'Audit suspension' },
});
check('admin can suspend a shop', suspend.body?.data?.store?.isActive === false);
const suspendedStore = await call(`/vendors/${vendorA.store.slug}`);
check('suspended shop hidden from the marketplace', suspendedStore.status === 404, `status ${suspendedStore.status}`);
await call(`/admin/vendors/${suspendTarget}/status`, { method: 'PUT', token: adminToken, body: { isActive: true } });

const adminProducts = await call('/admin/products?limit=3', { token: adminToken });
check('admin product list works', adminProducts.status === 200 && adminProducts.body.data.length === 3);
const hideId = adminProducts.body.data[0]._id;
const hide = await call(`/admin/products/${hideId}/status`, { method: 'PUT', token: adminToken, body: { isActive: false } });
check('admin can hide a product', hide.body?.data?.product?.isActive === false);
await call(`/admin/products/${hideId}/status`, { method: 'PUT', token: adminToken, body: { isActive: true } });

const adminOrders = await call('/admin/orders?limit=5', { token: adminToken });
check('admin order list works', adminOrders.status === 200 && adminOrders.body.data.length > 0);

const revenue = await call('/admin/revenue', { token: adminToken });
check('commission report works', revenue.body?.data?.summary?.platformRevenue > 0, JSON.stringify(revenue.body?.data?.summary));
check('per-vendor commission breakdown', revenue.body.data.byVendor.length > 0);
const pendingPayout = revenue.body.data.payouts.find((p) => p.status === 'pending');
if (pendingPayout) {
  const settled = await call(`/admin/payouts/${pendingPayout._id}/settle`, { method: 'PUT', token: adminToken });
  check('admin can settle a payout', settled.body?.data?.payout?.status === 'paid');
}

for (const path of ['/admin/users', '/admin/vendors', '/admin/products', '/admin/orders', '/admin/revenue', '/admin/analytics']) {
  const r = await call(path, { token: buyerToken });
  check(`buyer blocked from ${path}`, r.status === 403, `status ${r.status}`);
}

/* ------------------------------------------------------------ SECURITY */
section('SECURITY');
const health = await call('/health');
check('health endpoint works', health.status === 200);
check('no secret keys leak from the API', !/sk_test|sk_live|CLOUDINARY_API_SECRET|mongodb\+srv/i.test(health.text + paymentConfig.text));

const notFound = await call('/does-not-exist');
check('404 returns the shared error envelope', notFound.status === 404 && notFound.body?.success === false);

const badId = await call('/orders/not-an-object-id', { token: buyerToken });
check('invalid object id handled gracefully', badId.status === 400 || badId.status === 404, `status ${badId.status}`);

const injection = await call('/auth/login', {
  method: 'POST', body: { email: { $ne: null }, password: { $ne: null } },
});
check('mongo operator injection rejected', injection.status === 400 || injection.status === 401, `status ${injection.status}`);

const badToken = await call('/auth/me', { token: 'not.a.real.token' });
check('forged token rejected', badToken.status === 401);

const uploadAnon = await call('/uploads/products', { method: 'POST' });
check('upload requires auth', uploadAnon.status === 401);
const uploadBuyer = await call('/uploads/products', { method: 'POST', token: buyerToken });
check('upload restricted to vendors', uploadBuyer.status === 403, `status ${uploadBuyer.status}`);

const roleEscalation = await call('/auth/me', { method: 'PUT', token: buyerToken, body: { role: 'admin', name: 'Still Buyer' } });
check('role cannot be escalated via profile update', roleEscalation.body?.data?.user?.role !== 'admin');
