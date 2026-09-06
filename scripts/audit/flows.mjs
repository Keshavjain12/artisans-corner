/* Second audit pass: the checklist items that need multipart, failure paths
   and multi-vendor baskets. */
import {
  BASE,
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

const buyerToken = await login('buyer@artisanscorner.demo', 'DemoBuyer123!');
const adminToken = await login('admin@artisanscorner.demo', 'DemoAdmin123!');

/* -------------------------------------------------------- IMAGE UPLOAD */
section('IMAGE UPLOAD');
const uploader = await registerVendor(`Upload Studio ${rand()}`);

// A real 1x1 PNG - valid magic bytes, so it passes the signature check.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

const uploadForm = new FormData();
uploadForm.append('images', new Blob([PNG], { type: 'image/png' }), 'swatch.png');
const uploadRes = await fetch(`${BASE}/uploads/products`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${uploader.token}` },
  body: uploadForm,
});
const uploaded = await uploadRes.json();
check('vendor image upload works', uploadRes.status === 201, JSON.stringify(uploaded).slice(0, 120));
const imageUrl = uploaded?.data?.images?.[0]?.url;
check('upload returns a hosted URL', typeof imageUrl === 'string' && imageUrl.startsWith('http'), imageUrl);
check('no image binary is stored in the response', !/base64|iVBOR/.test(JSON.stringify(uploaded)));

if (imageUrl) {
  const fetched = await fetch(imageUrl);
  check('uploaded image is actually served', fetched.status === 200 && (fetched.headers.get('content-type') || '').startsWith('image/'), `status ${fetched.status}`);
}

const withImage = await makeProduct(uploader.token, { images: [{ url: imageUrl, publicId: uploaded?.data?.images?.[0]?.publicId || '', alt: 'swatch' }] });
check('uploaded URL can be saved on a product', withImage.res.status === 201 && withImage.product.images[0].url === imageUrl);

const notAnImage = new FormData();
notAnImage.append('images', new Blob([Buffer.from('this is not an image at all')], { type: 'image/png' }), 'fake.png');
const fakeRes = await fetch(`${BASE}/uploads/products`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${uploader.token}` },
  body: notAnImage,
});
check('file disguised as an image is rejected', fakeRes.status === 400, `status ${fakeRes.status}`);

const wrongType = new FormData();
wrongType.append('images', new Blob([Buffer.from('#!/bin/sh\necho hi')], { type: 'application/x-sh' }), 'evil.sh');
const shRes = await fetch(`${BASE}/uploads/products`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${uploader.token}` },
  body: wrongType,
});
check('non-image mime type is rejected', shRes.status === 400, `status ${shRes.status}`);

const emptyUpload = await fetch(`${BASE}/uploads/products`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${uploader.token}` },
  body: new FormData(),
});
check('empty upload is rejected with a clear message', emptyUpload.status === 400);

/* ------------------------------------------------ MULTI-VENDOR BASKETS */
section('MULTI-VENDOR CART');
const v1 = await registerVendor(`Multi A ${rand()}`);
const v2 = await registerVendor(`Multi B ${rand()}`);
const a = (await makeProduct(v1.token, { price: 60, stock: 5 })).product;
const b = (await makeProduct(v2.token, { price: 40, stock: 5 })).product;

const mixedBuyer = await registerBuyer();
const mixedIntent = await call('/payments/create-intent', {
  method: 'POST',
  token: mixedBuyer.token,
  body: {
    items: [
      { productId: a._id, quantity: 1 },
      { productId: b._id, quantity: 2 },
    ],
    shippingAddress: SHIP,
  },
});
const mixedTotals = mixedIntent.body?.data?.totals;
check('basket spanning two shops is priced correctly', mixedTotals?.subtotal === 140, JSON.stringify(mixedTotals));
check('commission across two shops', mixedTotals?.platformFee === 7 && mixedTotals?.vendorEarnings === 133);
check('one shipping charge for the whole order', mixedTotals?.shippingCost === 0);

const mixedConfirm = await call('/payments/confirm', {
  method: 'POST',
  token: mixedBuyer.token,
  body: { paymentIntentId: mixedIntent.body.data.paymentIntentId },
});
const mixedOrder = mixedConfirm.body?.data?.order;
check('multi-vendor order records both vendors', mixedOrder?.vendors?.length === 2, JSON.stringify(mixedOrder?.vendors));
check('each line keeps its own vendor', new Set(mixedOrder.items.map((i) => String(i.vendor))).size === 2);

const v1Payouts = await call('/vendors/me/payouts', { token: v1.token });
const v2Payouts = await call('/vendors/me/payouts', { token: v2.token });
check('vendor A paid only for their line', v1Payouts.body.data.summary.netEarnings === 57, JSON.stringify(v1Payouts.body.data.summary));
check('vendor B paid only for their line', v2Payouts.body.data.summary.netEarnings === 76, JSON.stringify(v2Payouts.body.data.summary));

const v1Orders = await call('/vendors/me/orders', { token: v1.token });
check("vendor A cannot see vendor B's line item", v1Orders.body.data[0].items.length === 1);
check('vendor A total reflects only their own line', v1Orders.body.data[0].vendorTotals.subtotal === 60);

/* ------------------------------------------------------ FAILURE PATHS */
section('PAYMENT AND ORDER FAILURE PATHS');
const unknownIntent = await call('/payments/confirm', {
  method: 'POST',
  token: mixedBuyer.token,
  body: { paymentIntentId: 'mock_pi_000000000000000000000000' },
});
check('confirming an unknown payment is rejected', unknownIntent.status === 404, `status ${unknownIntent.status}`);

const otherBuyer = await registerBuyer();
const stealConfirm = await call('/payments/confirm', {
  method: 'POST',
  token: otherBuyer.token,
  body: { paymentIntentId: mixedOrder.stripePaymentIntentId },
});
check("cannot confirm someone else's checkout", stealConfirm.status === 404, `status ${stealConfirm.status}`);

const emptyCart = await call('/payments/create-intent', {
  method: 'POST',
  token: mixedBuyer.token,
  body: { items: [], shippingAddress: SHIP },
});
check('empty cart cannot start a checkout', emptyCart.status === 400);

const ghost = await call('/payments/create-intent', {
  method: 'POST',
  token: mixedBuyer.token,
  body: { items: [{ productId: '0123456789abcdef01234567', quantity: 1 }], shippingAddress: SHIP },
});
check('deleted product cannot be bought', ghost.status === 400, ghost.body?.message);

const webhookNoSig = await call('/payments/webhook', { method: 'POST', body: { type: 'x' } });
check('webhook without a signature is refused', [400, 503].includes(webhookNoSig.status), `status ${webhookNoSig.status}`);

/* --------------------------------------------- CANCELLATION / RESTOCK */
section('ORDER CANCELLATION');
const cancelVendor = await registerVendor(`Cancel Studio ${rand()}`);
const cancelProduct = (await makeProduct(cancelVendor.token, { price: 50, stock: 5 })).product;
const cancelBuyer = await registerBuyer();
const cancelPurchase = await buy(cancelBuyer.token, cancelProduct._id, 2);

const midStock = (await call(`/products/${cancelProduct.slug}`)).body.data.product.stock;
check('stock reduced before cancellation', midStock === 3, `stock ${midStock}`);

const strangerCancel = await call(`/orders/${cancelPurchase.order._id}/cancel`, {
  method: 'POST',
  token: mixedBuyer.token,
});
check("another buyer cannot cancel someone's order", strangerCancel.status === 403);

const cancelled = await call(`/orders/${cancelPurchase.order._id}/cancel`, {
  method: 'POST',
  token: cancelBuyer.token,
});
check('buyer can cancel before dispatch', cancelled.body?.data?.order?.orderStatus === 'cancelled', cancelled.body?.message);

const restocked = (await call(`/products/${cancelProduct.slug}`)).body.data.product.stock;
check('cancelling returns stock to the shop', restocked === 5, `stock ${restocked}`);

const reversedPayouts = await call('/vendors/me/payouts', { token: cancelVendor.token });
check('cancelling reverses the vendor payout', reversedPayouts.body.data.payouts[0].status === 'reversed', reversedPayouts.body.data.payouts[0]?.status);

const doubleCancel = await call(`/orders/${cancelPurchase.order._id}/cancel`, {
  method: 'POST',
  token: cancelBuyer.token,
});
check('cancelling twice is rejected', doubleCancel.status === 400);

const shippedVendor = await registerVendor(`Shipped Studio ${rand()}`);
const shippedProduct = (await makeProduct(shippedVendor.token, { price: 50, stock: 5 })).product;
const shippedBuyer = await registerBuyer();
const shippedOrder = await buy(shippedBuyer.token, shippedProduct._id, 1);
await call(`/orders/${shippedOrder.order._id}/status`, {
  method: 'PUT',
  token: shippedVendor.token,
  body: { status: 'shipped' },
});
const lateCancel = await call(`/orders/${shippedOrder.order._id}/cancel`, {
  method: 'POST',
  token: shippedBuyer.token,
});
check('cannot cancel once shipped', lateCancel.status === 400, lateCancel.body?.message);

/* ------------------------------------------------- PAUSED SHOP / STOCK */
section('SHOP AVAILABILITY');
const pauseVendor = await registerVendor(`Pause Studio ${rand()}`);
const pausedProduct = (await makeProduct(pauseVendor.token, { price: 30, stock: 5 })).product;
await call('/vendors/me', { method: 'PUT', token: pauseVendor.token, body: { isActive: false } });

const pausedBuy = await call('/payments/create-intent', {
  method: 'POST',
  token: buyerToken,
  body: { items: [{ productId: pausedProduct._id, quantity: 1 }], shippingAddress: SHIP },
});
check('cannot buy from a paused shop', pausedBuy.status === 400, pausedBuy.body?.message);

const soldOutVendor = await registerVendor(`Sold Out ${rand()}`);
const lastOne = (await makeProduct(soldOutVendor.token, { price: 30, stock: 1 })).product;
const firstBuyer = await registerBuyer();
await buy(firstBuyer.token, lastOne._id, 1);
const tooLate = await call('/payments/create-intent', {
  method: 'POST',
  token: buyerToken,
  body: { items: [{ productId: lastOne._id, quantity: 1 }], shippingAddress: SHIP },
});
check('sold-out product cannot be bought', tooLate.status === 400 && /sold out/i.test(tooLate.body?.message || ''), tooLate.body?.message);
