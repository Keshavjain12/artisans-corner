# API Documentation - Artisan's Corner

Base URL: `${SERVER_URL}/api` (development: `http://localhost:5055/api`).

## Conventions

**Authentication.** A JWT is returned by `register`/`login` and sent back as
`Authorization: Bearer <token>`. The same token is also set as an httpOnly
cookie, so either transport works; the SPA uses the bearer header because it
survives cross-site deployments.

**Success envelope**

```json
{ "success": true, "message": "Products", "data": [], "meta": { "page": 1 } }
```

**Error envelope**

```json
{
  "success": false,
  "message": "Please check the highlighted fields",
  "errors": [{ "field": "price", "message": "Price must be greater than 0" }]
}
```

`errors` is present for validation failures. Stack traces are included as
`error` in development only, never in production.

**Pagination.** List endpoints accept `?page=&limit=` and return
`meta: { page, limit, total, totalPages, hasNextPage, hasPrevPage }`.

**Status codes.** `400` validation, `401` not signed in, `403` not permitted,
`404` missing, `409` conflict/duplicate, `413` file too large, `429` rate
limited, `5xx` server.

**Rate limits.** 1000 req / 15 min per IP across the API; 20 / 15 min on
auth endpoints (successful requests are not counted); 60 / 10 min on payments
and uploads.

---

## Health

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/health` | - | Environment, payment mode, image storage, commission rate |

## Auth

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/auth/register` | - | Create an account. Body: `name, email, password, confirmPassword` |
| POST | `/auth/login` | - | Sign in. Body: `email, password` |
| POST | `/auth/logout` | - | Clear the auth cookie |
| GET | `/auth/me` | user | Current user + store summary |
| PUT | `/auth/me` | user | Update `name`, `phone`, `avatar` |
| PUT | `/auth/change-password` | user | Body: `currentPassword, newPassword, confirmPassword` |

`role` in the register body is ignored - nobody can self-assign `vendor` or
`admin`.

## Catalogue (public)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/categories` | - | Categories with live product counts |
| GET | `/products` | - | Browse/search the marketplace |
| GET | `/products/:idOrSlug` | optional | One product plus 4 related items |
| GET | `/products/:id/reviews` | - | Paginated reviews + star distribution |
| GET | `/vendors` | - | Shop directory (`?q=` search) |
| GET | `/vendors/:slug` | - | One storefront and its products |

`GET /products` query parameters:

| Param | Values | Notes |
| --- | --- | --- |
| `q` | string | Matches product name, description, tags, category and shop name |
| `category` | category slug | |
| `vendor` | store slug | |
| `minPrice`, `maxPrice` | number | |
| `minRating` | 0-5 | |
| `inStock` | `true` | |
| `tag` | string | |
| `featured` | `true` | |
| `sort` | `featured`, `newest`, `price-asc`, `price-desc`, `rating`, `best-selling` | default `featured` |
| `page`, `limit` | number | `limit` max 60 |

Only products that are `isActive` and not `isArchived`, belonging to an active
store, are returned.

## Vendor onboarding and store

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/vendors/onboard` | user | "Become a Seller" - creates the store and upgrades the role |
| GET | `/vendors/me` | user | The signed-in user's store |
| PUT | `/vendors/me` | vendor | Update store profile (incl. `isActive` to pause the shop) |
| GET | `/vendors/me/analytics` | vendor | `?range=7d\|30d\|90d\|1y\|all` |
| GET | `/vendors/me/orders` | vendor | Orders containing this store's products |
| GET | `/vendors/me/payouts` | vendor | Earnings ledger + summary |

## Vendor product management

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/products/mine` | vendor | `?status=all\|active\|draft\|archived&q=` |
| GET | `/products/mine/:id` | vendor | One owned product |
| POST | `/products` | vendor | Create. `vendor` is taken from the session |
| PUT | `/products/:id` | vendor | Update - rejects another vendor's product with 403 |
| DELETE | `/products/:id` | vendor | Archive if it appears in an order, otherwise delete |
| POST | `/products/:id/restore` | vendor | Un-archive |

Create/update body: `name, description, price, compareAtPrice, category, stock,
sku, tags[], images[{url, publicId, alt}], isActive`.

## Uploads

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/uploads/products` | vendor | `multipart/form-data`, field `images`, up to 6 files |
| POST | `/uploads/store` | vendor | Single logo/banner image |
| DELETE | `/uploads` | vendor | Body `{ publicId }` |

Images are validated by MIME type **and** magic bytes, capped at 5MB, streamed
to Cloudinary and normalised (max 1600px, `quality: auto:good`, WebP). Only the
resulting URL is stored. With no Cloudinary credentials the server falls back to
`server/uploads` on local disk - a development convenience only.

## Payments

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/payments/config` | - | Provider, publishable key, commission/shipping/tax rules |
| POST | `/payments/quote` | user | Server-priced preview of a basket |
| POST | `/payments/create-intent` | user | Prices the cart, writes a pending order, opens a PaymentIntent |
| POST | `/payments/confirm` | user | Re-reads the intent from Stripe, then finalises the order |
| POST | `/payments/webhook` | Stripe signature | `payment_intent.succeeded` / `payment_intent.payment_failed` |

`create-intent` body:

```json
{
  "items": [{ "productId": "65f...", "quantity": 2 }],
  "shippingAddress": {
    "fullName": "Ava Thompson",
    "addressLine1": "14 Rosewood Lane",
    "addressLine2": "",
    "city": "Brooklyn",
    "state": "New York",
    "postalCode": "11215",
    "country": "United States",
    "phone": "+1 917 555 0143"
  },
  "saveAddress": true
}
```

The browser sends **only product ids and quantities**. Prices, vendor ownership,
stock, shipping, tax, commission and the total are all derived from MongoDB. Any
`price`/`total` field in the request body is discarded by the validator.

The webhook is mounted before the JSON body parser so Stripe's signature can be
verified against the raw body.

## Orders

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/orders/my-orders` | user | The buyer's own orders |
| GET | `/orders/:id` | buyer / vendor / admin | Vendors receive only their own line items |
| PUT | `/orders/:id/status` | vendor | Body `{ status, trackingNumber?, itemIds? }` - own lines only |
| POST | `/orders/:id/cancel` | buyer / admin | Allowed before shipping; restocks and reverses payouts |

## Reviews

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/reviews/pending` | user | Purchased products awaiting a review |
| POST | `/reviews` | user | Body `{ productId, orderId?, rating, title?, comment }` |
| PUT | `/reviews/:id` | author | Edit rating/title/comment |
| DELETE | `/reviews/:id` | author / admin | Remove and recompute the product rating |

A review requires a paid, non-cancelled order for that product by that buyer;
otherwise the API returns `403`. A second review for the same product returns
`409` (edit the existing one instead).

## Admin

All admin routes require `role: admin`.

| Method | Path | Description |
| --- | --- | --- |
| GET | `/admin/users` | `?role=&status=&q=` |
| PUT | `/admin/users/:id` | `{ isActive?, role? }` - cannot target your own account |
| GET | `/admin/vendors` | `?status=active\|suspended&q=` |
| PUT | `/admin/vendors/:id/status` | `{ isActive, reason? }` |
| GET | `/admin/products` | `?status=active\|hidden\|archived&category=&q=` |
| PUT | `/admin/products/:id/status` | `{ isActive }` |
| GET | `/admin/orders` | `?status=&paymentStatus=&q=` |
| GET | `/admin/revenue` | Payout ledger, platform totals, per-vendor breakdown |
| PUT | `/admin/payouts/:id/settle` | Mark a recorded payout as settled |
| GET | `/admin/analytics` | `?range=7d\|30d\|90d\|1y\|all` |
