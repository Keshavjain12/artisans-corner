# Deployment — getting the live link

The brief's second deliverable is *"a fully functional deployed link"*. The
application is deployment-ready; this is the exact sequence to produce that
link. It needs three free accounts (MongoDB Atlas, Cloudinary, Stripe) plus a
host for each half. Budget about 30 minutes end to end.

Nothing here is hard-coded to a machine: the client reads `VITE_API_URL`, the
server reads `CLIENT_URL` / `SERVER_URL`, and the server refuses to boot in
production if a required secret is missing.

---

## 1. MongoDB Atlas — the database

1. Create a free **M0** cluster at <https://cloud.mongodb.com>.
2. **Database Access** → add a user, note the password.
3. **Network Access** → add `0.0.0.0/0` (a hosted API has no fixed IP).
4. **Connect → Drivers** → copy the connection string and append the database
   name:

```
mongodb+srv://<user>:<password>@<cluster>.mongodb.net/artisans-corner?retryWrites=true&w=majority
```

## 2. Cloudinary — product images

1. Sign up at <https://cloudinary.com> (free tier is plenty).
2. From the dashboard copy **Cloud name**, **API Key**, **API Secret**.

Without these the server falls back to writing uploads to local disk, which does
not survive a redeploy on most hosts — so set them before going live.

## 3. Stripe — payments (test mode)

1. Create an account at <https://stripe.com> and stay in **test mode**.
2. **Developers → API keys** → copy `pk_test_…` and `sk_test_…`.
3. The webhook secret comes later, in step 5 — you need the API URL first.

---

## 4. The API — Render

Render can read `render.yaml` from the repo, or set it up by hand:

| Setting | Value |
| --- | --- |
| Repository | your fork of this repo |
| Root directory | `server` |
| Build command | `npm install` |
| Start command | `npm start` |
| Health check path | `/api/health` |

Environment variables:

```
NODE_ENV=production
MONGO_URI=<the Atlas string from step 1>
JWT_SECRET=<a long random string — openssl rand -hex 32>
CLIENT_URL=https://<your-frontend>.vercel.app
SERVER_URL=https://<your-api>.onrender.com
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=<filled in at step 5>
ALLOW_MOCK_PAYMENTS=false
```

`CLIENT_URL` is the CORS allow-list — it must match the deployed frontend
exactly, with no trailing slash. Several origins can be comma separated.

Deploy, then check `https://<your-api>.onrender.com/api/health` returns JSON
saying `"payments":"stripe"` and `"imageStorage":"cloudinary"`. If it says
`mock` or `local-disk`, a variable is missing.

> Render's free tier sleeps after inactivity, so the first request can take
> ~30 seconds. Warn whoever is reviewing the link, or use a paid instance.

## 5. The Stripe webhook

1. Stripe dashboard → **Developers → Webhooks → Add endpoint**.
2. URL: `https://<your-api>.onrender.com/api/payments/webhook`
3. Events: `payment_intent.succeeded` and `payment_intent.payment_failed`.
4. Copy the signing secret (`whsec_…`) into `STRIPE_WEBHOOK_SECRET` on Render
   and redeploy.

The webhook is what makes payment authoritative — the browser's confirmation is
only a fast path, and both are idempotent, so an order is never created twice.

## 6. The client — Vercel

| Setting | Value |
| --- | --- |
| Root directory | `client` |
| Framework preset | Vite |
| Build command | `npm run build` |
| Output directory | `dist` |

Environment variable:

```
VITE_API_URL=https://<your-api>.onrender.com/api
```

Netlify works identically — `netlify.toml` is in the repo. Both configs include
the SPA rewrite, so a deep link like `/product/hand-thrown-tea-set` survives a
refresh.

## 7. Seed the live database

From your machine, pointing at Atlas:

```bash
cd server
MONGO_URI="<the Atlas string>" npm run seed
```

That creates the demo accounts the README documents, six shops, thirty
products, ninety paid orders and their reviews — so the reviewer opens a
marketplace with something in it.

## 8. Check the live site

- [ ] `/api/health` reports `stripe` and `cloudinary`
- [ ] The homepage loads products (if not, `VITE_API_URL` or CORS is wrong)
- [ ] Sign in as the demo buyer, and buy something with card
      `4242 4242 4242 4242`, any future expiry, any CVC
- [ ] The order appears under **My orders**
- [ ] Stripe dashboard → **Payments** shows the charge
- [ ] Sign in as the demo vendor: the sale shows in **Earnings** with the 5%
      fee deducted
- [ ] Sign in as the demo admin: **Revenue** shows the platform's commission

Then put the link and the demo credentials at the top of the README.

---

## Troubleshooting

**Products do not load, console shows a CORS error.** `CLIENT_URL` on the API
does not match the frontend origin exactly. No trailing slash.

**The API will not start.** It fails fast in production when `JWT_SECRET`,
`MONGO_URI`, Stripe or Cloudinary are missing, or when `ALLOW_MOCK_PAYMENTS` is
still `true`. The log names the offending variable.

**Payment succeeds but the order stays pending.** The webhook secret is wrong,
or the endpoint URL has a typo. Stripe's dashboard shows the delivery attempts
and their responses.

**Images upload but disappear later.** Cloudinary is not configured, so files
went to the container's local disk and were lost on redeploy.
