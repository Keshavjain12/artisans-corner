# Artisan's Corner

A multi-vendor marketplace for handmade goods - potters, weavers, silversmiths
and printmakers selling directly to buyers. Anyone can register as a buyer, and
any buyer can open a shop with the same account. The platform takes a
configurable **5% commission**; the remaining 95% is recorded as a vendor payout.

Built as a full-stack MERN project: React + Vite + Redux Toolkit on the front,
Express + MongoDB on the back, Stripe for payments and Cloudinary for imagery.

---

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Folder structure](#folder-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [MongoDB setup](#mongodb-setup)
- [Cloudinary setup](#cloudinary-setup)
- [Stripe setup](#stripe-setup)
- [Seeding the database](#seeding-the-database)
- [Demo credentials](#demo-credentials)
- [API overview](#api-overview)
- [Database schema](#database-schema)
- [Testing](#testing)
- [Security notes](#security-notes)
- [Deployment](#deployment)
- [Screenshots](#screenshots)
- [Known limitations](#known-limitations)
- [Future improvements](#future-improvements)

---

## Features

### Buyers
- Register, sign in, manage profile and password
- Browse the marketplace with search, category / price / rating / stock filters
  and five sort orders
- Product pages with an image gallery, stock state, seller card and reviews
- Cart in Redux, persisted to `localStorage`, clamped to available inventory
- Multi-vendor cart: one basket can span several shops and still attribute every
  line to the right studio
- Four-step checkout (review, shipping, payment, confirmation) with Stripe
- Order history, an order timeline, per-item tracking numbers and cancellation
- Verified reviews: only a buyer with a paid order for that product can review it

### Vendors
- "Become a Seller" upgrades the existing account - no second login
- Store profile with logo, banner, location and contact details; the shop can be
  paused at any time
- Full product CRUD with multi-image upload (preview, reorder, remove)
- Soft delete: products that appear in an order are archived, not destroyed
- Order queue showing only their own lines, with the shipping address they need
- Fulfilment status transitions (processing → confirmed → shipped → delivered)
- Earnings ledger showing gross sales, the 5% fee and net payout per order
- Analytics from real order data: revenue, fees, net earnings, orders, units,
  average order value, best sellers, with 7d / 30d / 90d / 1y ranges

### Admins
- Platform dashboard: gross sales, commission revenue, vendor earnings, users,
  vendors, products, orders, sales by category, top shops
- User management (deactivate / reactivate, role changes)
- Vendor moderation (suspend a shop and everything it sells)
- Product moderation (hide / publish any listing)
- Order browser across the whole marketplace
- Commission report and payout ledger with settle-payout action

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | React 18, Vite 6, React Router 6, Redux Toolkit, Axios, Tailwind CSS 3, Recharts, React Hook Form, lucide-react, react-hot-toast |
| Backend | Node.js 18+, Express 4, Mongoose 8, JWT, bcryptjs, Zod, Multer |
| Database | MongoDB (local or Atlas) |
| Services | Stripe (payments), Cloudinary (images) |
| Security | Helmet, CORS allow-list, express-rate-limit, express-mongo-sanitize, hpp |
| Tooling | ESLint, Prettier, Jest, Supertest, mongodb-memory-server |

---

## Architecture

```
Browser (React SPA)
   |  JSON over HTTPS, Bearer JWT
   v
Express API  ── routes ─> validators (Zod) ─> controllers ─> services ─> Mongoose models
   |                              |                 |
   |                              |                 +── pricing.service   (the only place a basket is priced)
   |                              |                 +── order.service     (idempotent order finalisation, payouts)
   |                              |                 +── analytics.service (aggregation pipelines)
   |                              |                 +── upload.service    (Cloudinary streaming)
   |                              +── middleware: auth, rate limit, error handler
   v
MongoDB          Stripe (PaymentIntents + webhook)          Cloudinary (image CDN)
```

Three rules shape the backend:

1. **The server owns money.** The browser only ever sends product ids and
   quantities. `pricing.service.js` reads prices, stock, vendor ownership and the
   commission rate from MongoDB and computes the authoritative total.
2. **Ownership comes from the session.** Product `vendor`, order `buyer` and
   review `user` are taken from the JWT, never from the request body.
3. **Finalising an order is idempotent.** The Stripe webhook and the browser
   confirmation both call `finalizePaidOrder`; `paymentStatus` and
   `inventoryApplied` guards make the second call a no-op, so stock is never
   double-decremented and a vendor is never paid twice.

### Redux state

```
auth  { user, store, token, status, error }   // session, hydrated from /auth/me
cart  { items[], lastAdded }                  // persisted to localStorage
```

Server data (products, orders, analytics) is fetched per screen with a small
`useAsync` hook rather than being mirrored into Redux, which keeps the store
small and avoids stale caches.

---

## Folder structure

```
artisans-corner/
├── client/
│   ├── public/favicon.svg
│   └── src/
│       ├── components/      ProductCard, ReviewSection, ImageUploader, charts, ui primitives...
│       ├── hooks/           useAsync, useDebounce, useDocumentTitle
│       ├── layouts/         MainLayout, SellerLayout, AdminLayout
│       ├── pages/           marketplace pages + seller/ and admin/ dashboards
│       ├── routes/          AppRoutes (lazy loaded), ProtectedRoute
│       ├── services/        axios instance + one module per API area
│       ├── store/           Redux Toolkit slices (auth, cart)
│       ├── utils/           formatting, constants, cn
│       ├── App.jsx  main.jsx  index.css
│       ├── tailwind.config.js  vite.config.js
├── server/
│   ├── config/              env, db, cloudinary, stripe, categories
│   ├── controllers/         auth, product, store, order, review, payment, admin, upload, analytics
│   ├── middleware/          auth, validate, upload, rateLimit, error
│   ├── models/              User, Store, Category, Product, Order, Review, Payout
│   ├── routes/              one router per resource + index
│   ├── services/            pricing, order, analytics, upload
│   ├── utils/               ApiError, apiResponse, asyncHandler, money, slugify, pagination, token
│   ├── validators/          Zod schemas
│   ├── seed/                seed.js + demo catalogue
│   ├── tests/               Jest + Supertest suites
│   ├── app.js  server.js
├── docs/
│   ├── database-schema.md   ER diagram + collection notes
│   └── api-documentation.md every endpoint
├── .env.example
└── README.md
```

---

## Getting started

**Prerequisites:** Node.js 18.18+, npm 9+, and MongoDB (local or an Atlas
connection string).

```bash
git clone <your-repo-url> artisans-corner
cd artisans-corner

# install both workspaces
npm run install:all

# configure the backend
cp .env.example server/.env      # then edit server/.env

# configure the frontend (optional in dev - defaults to the Vite proxy)
cp client/.env.example client/.env

# seed demo data (6 shops, 30 products, orders, reviews)
npm run seed

# run API (:5000) and client (:5173) together
npm run dev
```

Open <http://localhost:5173>.

Individual commands:

| Command | What it does |
| --- | --- |
| `npm run dev` | API + client together |
| `npm run dev:server` | API only, with `node --watch` |
| `npm run dev:client` | Vite dev server only |
| `npm run seed` | Wipe and reseed the database |
| `npm --prefix server run seed:destroy` | Empty the database |
| `npm test` | Backend test suite |
| `npm run build` | Production build of the client |
| `npm run lint` | ESLint over both workspaces |

---

## Environment variables

Backend (`server/.env`) - see `.env.example` for the full annotated list:

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `NODE_ENV` | no | `development` | |
| `PORT` | no | `5000` | API port |
| `MONGO_URI` | **yes** | local mongod | MongoDB connection string |
| `JWT_SECRET` | **yes** | dev fallback | Signing key - use a long random string |
| `JWT_EXPIRES_IN` | no | `7d` | Token lifetime |
| `CLIENT_URL` | no | `http://localhost:5173` | CORS allow-list (comma separated) |
| `SERVER_URL` | no | `http://localhost:5000` | Used for locally stored image URLs |
| `PLATFORM_COMMISSION_RATE` | no | `0.05` | Marketplace commission |
| `SHIPPING_FLAT_RATE` | no | `5` | Flat shipping charge |
| `FREE_SHIPPING_THRESHOLD` | no | `75` | Subtotal above which shipping is free |
| `TAX_RATE` | no | `0` | Applied to the subtotal |
| `CURRENCY` | no | `usd` | Stripe currency |
| `CLOUDINARY_*` | prod | empty | Cloud name, API key, API secret |
| `STRIPE_SECRET_KEY` | prod | empty | `sk_test_...` |
| `STRIPE_PUBLISHABLE_KEY` | prod | empty | `pk_test_...`, served to the client |
| `STRIPE_WEBHOOK_SECRET` | prod | empty | `whsec_...` |
| `ALLOW_MOCK_PAYMENTS` | no | `false` | **Dev only** - lets checkout complete without Stripe keys |

Frontend (`client/.env`):

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | `/api` | API base URL. In development the Vite proxy forwards `/api` to `:5000`; in production set the full API URL |
| `VITE_STRIPE_PUBLISHABLE_KEY` | empty | Fallback only - the key normally comes from the API |

The server refuses to start in production if `JWT_SECRET`, `MONGO_URI`, Stripe
or Cloudinary are missing, or if `ALLOW_MOCK_PAYMENTS` is still enabled.

---

## MongoDB setup

**Local:** install MongoDB Community Server, start `mongod`, and keep the
default `MONGO_URI=mongodb://127.0.0.1:27017/artisans-corner`.

**Atlas:** create a free M0 cluster, add a database user, allow your IP (or
`0.0.0.0/0` for a hosted API), then copy the connection string:

```
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/artisans-corner?retryWrites=true&w=majority
```

Indexes are created automatically outside production. For a production
deployment, run the app once with `autoIndex` enabled or create the indexes
listed in [`docs/database-schema.md`](docs/database-schema.md) manually.

---

## Cloudinary setup

1. Create a free account at <https://cloudinary.com>.
2. From the dashboard copy **Cloud name**, **API Key** and **API Secret**.
3. Put them in `server/.env` as `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`
   and `CLOUDINARY_API_SECRET`.

Uploads go to the `artisans-corner/products` and `artisans-corner/stores`
folders, are limited to 5MB, validated by magic bytes as well as MIME type, and
transformed server-side (max 1600px, `quality: auto:good`, WebP). Only the
secure URL and `public_id` are stored in MongoDB - **no image binary ever goes
into the database**, and the API secret never reaches the browser.

If Cloudinary is not configured the server writes uploads to `server/uploads/`
and serves them from `/uploads`. That is a local development convenience only;
production requires real credentials.

---

## Stripe setup

1. Create an account at <https://stripe.com> and stay in **test mode**.
2. Copy the test keys into `server/.env`:
   `STRIPE_SECRET_KEY=sk_test_...`, `STRIPE_PUBLISHABLE_KEY=pk_test_...`.
3. Forward webhooks while developing:

   ```bash
   stripe login
   stripe listen --forward-to localhost:5000/api/payments/webhook
   ```

   Copy the printed `whsec_...` into `STRIPE_WEBHOOK_SECRET`.
4. Restart the API, then check out with a test card:

| Card | Result |
| --- | --- |
| `4242 4242 4242 4242` | Payment succeeds |
| `4000 0000 0000 9995` | Declined (insufficient funds) |
| `4000 0025 0000 3155` | Requires 3D Secure authentication |

Any future expiry, any CVC, any postcode.

**Without Stripe keys:** set `ALLOW_MOCK_PAYMENTS=true` and checkout runs in
simulated payment mode - the card form is replaced by a clearly labelled button,
but the order, inventory movement, commission split and vendor payout are all
created for real. This exists so the project is demo-able out of the box; it is
rejected in production.

---

## Seeding the database

```bash
npm run seed
```

Creates 10 categories, 1 admin, 3 buyers, 6 vendor accounts with stores,
30 realistic handmade products, 26 paid orders spread over the last 90 days
(each one through the real pricing and payout pipeline, with fulfilment statuses
that age with the order) and verified reviews on delivered items.

`npm --prefix server run seed:destroy` empties every collection.

Seed imagery uses deterministic placeholder photography so a fresh clone always
renders complete cards; real vendors upload through Cloudinary.

---

## Demo credentials

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@artisanscorner.demo` | `DemoAdmin123!` |
| Vendor | `vendor@artisanscorner.demo` | `DemoVendor123!` |
| Buyer | `buyer@artisanscorner.demo` | `DemoBuyer123!` |

The demo vendor owns **Terra & Thread**. Five more vendor accounts exist
(`ines@`, `tama@`, `daniel@`, `rahul@`, `aoife@` `artisanscorner.demo`), all with
the vendor password. The sign-in page has one-click buttons that fill in these
credentials.

The demo vendor is also a buyer - sign in as the vendor, buy something from
another shop, and both sides of the marketplace work from the same account.

---

## API overview

Full reference: [`docs/api-documentation.md`](docs/api-documentation.md).

```
POST   /api/auth/register            POST   /api/auth/login
GET    /api/auth/me                  POST   /api/auth/logout

GET    /api/categories
GET    /api/products                 GET    /api/products/:idOrSlug
GET    /api/products/:id/reviews
POST   /api/products                 PUT    /api/products/:id
DELETE /api/products/:id             GET    /api/products/mine

POST   /api/vendors/onboard          GET    /api/vendors/me
PUT    /api/vendors/me               GET    /api/vendors/me/analytics
GET    /api/vendors/me/orders        GET    /api/vendors/me/payouts
GET    /api/vendors                  GET    /api/vendors/:slug

POST   /api/payments/quote           POST   /api/payments/create-intent
POST   /api/payments/confirm         POST   /api/payments/webhook

GET    /api/orders/my-orders         GET    /api/orders/:id
PUT    /api/orders/:id/status        POST   /api/orders/:id/cancel

POST   /api/reviews                  PUT    /api/reviews/:id
DELETE /api/reviews/:id              GET    /api/reviews/pending

POST   /api/uploads/products         POST   /api/uploads/store

GET    /api/admin/users              PUT    /api/admin/users/:id
GET    /api/admin/vendors            PUT    /api/admin/vendors/:id/status
GET    /api/admin/products           PUT    /api/admin/products/:id/status
GET    /api/admin/orders             GET    /api/admin/revenue
GET    /api/admin/analytics          PUT    /api/admin/payouts/:id/settle
```

Every response uses the same envelope:

```json
{ "success": true, "message": "...", "data": {}, "meta": {} }
{ "success": false, "message": "...", "errors": [{ "field": "", "message": "" }] }
```

---

## Database schema

Full ER diagram and collection notes:
[`docs/database-schema.md`](docs/database-schema.md).

```
User 1──0..1 Store 1──* Product
User 1──*    Order  1──* OrderItem *──1 Product
                    OrderItem *──1 Store
Order 1──*   Payout *──1 Store
User 1──*    Review *──1 Product     (Review *──1 Order = proof of purchase)
Category 1──* Product                (by slug)
```

Order items snapshot the product name, image and price, so editing or archiving
a product never rewrites order history.

---

## Testing

```bash
npm test          # from the repo root, or: npm --prefix server test
```

34 tests run against an in-memory MongoDB (`mongodb-memory-server`), so no
running database is needed.

| Suite | Covers |
| --- | --- |
| `auth.test.js` | Registration validation, duplicate email, password never returned, self-assigned `admin` role ignored, login, `/auth/me` guard |
| `product.test.js` | Vendor-only creation, ownership on edit and delete (vendor A cannot touch vendor B), field validation, category whitelist, search and category filters, deactivated products hidden |
| `checkout.test.js` | Server-side pricing, 5% commission split, client-sent prices ignored, shipping threshold, stock ceiling, inactive products, auth required |
| `order-review.test.js` | Order creation, stock decrement, payout recording, idempotent confirmation, price snapshots surviving a price change, cross-buyer order access denied, verified-purchase reviews, duplicate reviews, rating range |
| `money.test.js` | Commission maths, rounding invariants, Stripe minor-unit conversion |

---

## Security notes

- **Passwords** hashed with bcrypt (cost 12), `select: false`, and stripped in
  `toJSON` so they cannot leak through any response.
- **JWT** signed with `JWT_SECRET`, sent as a bearer token and mirrored into an
  httpOnly cookie. Expired or revoked tokens clear the client session.
- **Authorization** enforced server-side on every protected route
  (`authenticateUser`, `authorizeRoles`, `requireStore`). The React
  `ProtectedRoute` is a UX convenience, not the security boundary.
- **Never trusted from the client:** price, subtotal, total, commission, vendor
  id, product ownership, or `role`. Zod schemas whitelist request bodies, so
  extra fields are dropped rather than persisted.
- **Payments** verified against Stripe (`paymentIntents.retrieve`) and via a
  signature-checked webhook on the raw body. Order finalisation is idempotent.
- **Inventory** decremented with a conditional update
  (`{ stock: { $gte: quantity } }`), so two simultaneous checkouts cannot
  oversell the last item.
- **Reviews** require a paid, non-cancelled order containing that product.
- **Uploads** limited to 5MB, checked by MIME type *and* magic bytes, capped at
  6 files, and restricted to vendors/admins.
- **Transport and headers:** Helmet, a CORS allow-list from `CLIENT_URL`,
  `hpp` against parameter pollution, `express-mongo-sanitize` against operator
  injection, and rate limits on the API generally, on auth, and on
  payments/uploads.
- **Errors** normalised centrally; stack traces are development-only and 5xx
  messages are generic in production.
- **Secrets** live in `.env` (git-ignored). Cloudinary and Stripe secret keys
  never reach the browser - the client only ever receives the publishable key.

---

## Deployment

The client and API deploy independently.

### API - Render / Railway / Fly.io

- Root directory: `server`
- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/api/health`
- Environment: every variable from the table above, with
  `NODE_ENV=production`, `ALLOW_MOCK_PAYMENTS=false`, and
  `CLIENT_URL=https://your-frontend-domain` (comma separate multiple origins).

`render.yaml` in the repo root describes this service; Render can create it
directly from the blueprint.

After the first deploy, add a Stripe webhook endpoint pointing at
`https://your-api-domain/api/payments/webhook`, subscribe it to
`payment_intent.succeeded` and `payment_intent.payment_failed`, and put the
signing secret in `STRIPE_WEBHOOK_SECRET`.

### Client - Vercel / Netlify

- Root directory: `client`
- Build command: `npm run build`
- Output directory: `dist`
- Environment: `VITE_API_URL=https://your-api-domain/api`

`vercel.json` and `netlify.toml` are included; both add the SPA rewrite that
makes deep links such as `/product/hand-thrown-tea-set` work on refresh.

### Checklist

- [ ] `MONGO_URI` points at Atlas, and the API's egress IP is allow-listed
- [ ] `JWT_SECRET` is a long random string, different from development
- [ ] `CLIENT_URL` matches the deployed frontend exactly (no trailing slash)
- [ ] Stripe keys are set and the webhook endpoint is registered
- [ ] Cloudinary credentials are set
- [ ] `ALLOW_MOCK_PAYMENTS=false`
- [ ] `npm run seed` run once against the production database (optional, for a demo)

No localhost URL is hard-coded anywhere: the client reads `VITE_API_URL` and the
server reads `CLIENT_URL` / `SERVER_URL`.

---

## Screenshots

Add screenshots here when submitting:

| Screen | File |
| --- | --- |
| Marketplace home | `docs/screenshots/home.png` |
| Shop with filters | `docs/screenshots/shop.png` |
| Product detail + reviews | `docs/screenshots/product.png` |
| Cart and checkout | `docs/screenshots/checkout.png` |
| Vendor dashboard | `docs/screenshots/vendor-dashboard.png` |
| Vendor analytics | `docs/screenshots/vendor-analytics.png` |
| Admin revenue | `docs/screenshots/admin-revenue.png` |
| Database schema diagram | `docs/screenshots/schema.png` |

---

## Known limitations

- **Payouts are recorded, not transferred.** The ledger is complete and correct,
  but no money moves to a vendor's bank. A production build would use Stripe
  Connect with destination charges or transfers.
- **Refunds are not automated.** Cancelling an order restocks the items and
  reverses the payout rows, but the Stripe refund would have to be issued from
  the dashboard. If an item sells out between the payment intent and capture,
  the order records the refund that is due rather than issuing it.
- **Single shop per user**, by design (`stores.owner` is unique).
- **No shipping-rate engine.** Shipping is a flat rate with a free threshold, not
  per-vendor or weight-based, so a multi-vendor order is charged once.
- **No email.** Order confirmations, password reset and vendor notifications are
  out of scope; the newsletter form is a toast, not a mailing list.
- **No real-time updates.** Dashboards refresh on navigation, not over sockets.
- **Search is regex-based**, which is fine at this scale but would want Atlas
  Search or a text index with relevance scoring for a large catalogue.
- **Frontend has no automated tests.** Testing effort went into backend business
  logic and API authorisation, which is where the risk is.

---

## Future improvements

- Stripe Connect for real vendor payouts, plus automated refunds
- Buyer/vendor messaging and email notifications
- Wishlists, saved searches and product variants (size, colour, materials)
- Coupon codes and per-vendor shipping profiles
- Atlas Search with facets and typo tolerance
- Component and end-to-end tests (Vitest + Playwright)
- Image CDN responsive `srcset` and blur-up placeholders
- Vendor payout scheduling and downloadable statements

---

Built as a full-stack internship project. Licensed for educational use.
