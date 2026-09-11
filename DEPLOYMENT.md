# Deployment — getting the live link

The brief's final deliverable is *"a fully functional deployed link"*. This is
the exact sequence, written for Windows PowerShell. It needs three free accounts
— **MongoDB Atlas**, **Render** and **Vercel** — plus the Cloudinary account you
already have. Budget about 30 minutes.

Nothing is hard-coded to a machine: the client reads `VITE_API_URL`, the server
reads `CLIENT_URL` / `SERVER_URL`, and the server refuses to boot in production
if anything it genuinely needs is missing — the log names the variable.

> **About payments.** Stripe onboarding is invite-only in India and asks for
> company registration documents, so this deployment runs as a **labelled
> demo**: `DEMO_DEPLOYMENT=true` and `ALLOW_MOCK_PAYMENTS=true`. Production
> refuses simulated payments unless *both* are set, and the live site then shows
> a banner saying so. Orders, stock, the 5% commission and vendor payouts are all
> real. If Stripe keys ever arrive, see [Switching to Stripe](#switching-to-stripe).

---

## 1. MongoDB Atlas — the database

1. Create a free **M0** cluster at <https://cloud.mongodb.com>.
2. **Database Access** → add a database user; note the password.
3. **Network Access** → add `0.0.0.0/0` (a hosted API has no fixed IP address).
4. **Connect → Drivers** → copy the connection string, and add the database
   name before the `?`:

```
mongodb+srv://<user>:<password>@<cluster>.mongodb.net/artisans-corner?retryWrites=true&w=majority
```

If the password contains `@`, `:` or `/`, it must be URL-encoded in the string.

## 2. Seed the live database

From the repo root, in PowerShell. `npm run seed` **wipes the target database
first** — that is what you want here, on a brand new cluster:

```powershell
$env:MONGO_URI = "mongodb+srv://<user>:<password>@<cluster>.mongodb.net/artisans-corner?retryWrites=true&w=majority"
npm run seed
Remove-Item Env:MONGO_URI
```

The last line matters: without it, every command in that terminal keeps
pointing at Atlas instead of your local database. The seed prints the demo
accounts and `[seed] target database: artisans-corner` when it succeeds.

## 3. The API — Render

1. <https://render.com> → sign in with GitHub → **New → Blueprint**.
2. Pick this repository. Render reads `render.yaml`, which already sets the root
   directory (`backend`), build and start commands, the health check, a
   generated `JWT_SECRET`, and the two demo flags.
3. It then asks for the values marked `sync: false`:

| Variable | Value |
| --- | --- |
| `MONGO_URI` | the Atlas string from step 1 |
| `CLIENT_URL` | leave as `https://placeholder.vercel.app` for now — fixed in step 5 |
| `SERVER_URL` | `https://<service-name>.onrender.com` (shown at the top of the service page) |
| `CLOUDINARY_CLOUD_NAME` | from your Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | from your Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | from your Cloudinary dashboard |
| `STRIPE_SECRET_KEY` | leave empty |
| `STRIPE_PUBLISHABLE_KEY` | leave empty |
| `STRIPE_WEBHOOK_SECRET` | leave empty |

4. Deploy. Open `https://<service-name>.onrender.com/api/health` — you want:

```json
"database": "persistent", "payments": "mock", "demo": true, "imageStorage": "cloudinary"
```

If the service fails to start, **Logs** shows `Invalid production configuration`
followed by exactly which variable is wrong.

## 4. The site — Vercel

1. <https://vercel.com> → sign in with GitHub → **Add New → Project** → import
   this repository.
2. Leave **Root Directory** as the repository root. `vercel.json` sets the
   install command, build command, output folder (`frontend/dist`) and the SPA
   rewrite — do not override them.
3. **Environment Variables** → add one:

```
VITE_API_URL = https://<service-name>.onrender.com/api
```

It is read at *build* time, so if you add or change it later, redeploy.

4. Deploy, and note the URL Vercel gives you, e.g. `https://artisans-corner.vercel.app`.

## 5. Connect the two

Back on Render → your service → **Environment** → set `CLIENT_URL` to the exact
Vercel URL — `https://` included, **no trailing slash** — and save. Render
redeploys. `CLIENT_URL` is the CORS allow-list; until it matches, the site loads
but shows no products.

## 6. Prove it works

```powershell
$env:API = "https://<service-name>.onrender.com/api"
$env:SITE = "https://<your-site>.vercel.app"
npm run smoke
```

`npm run smoke` is read-only — it writes nothing, so it is safe against the
database you are handing in. It checks the API, the seeded catalogue, CORS from
the site's origin, deep-link rewrites, that product photographs are served, and
that the demo buyer can sign in. Every line should say `ok`.

Then walk it by hand once:

- [ ] The homepage shows products and the demo banner
- [ ] Sign in as the demo buyer, buy something, see it under **My orders**
- [ ] Sign in as the demo vendor: the sale is in **Earnings**, 5% fee deducted
- [ ] As the vendor, upload a product photo — its URL starts `https://res.cloudinary.com/`
- [ ] Sign in as the demo admin: **Revenue** shows the platform commission

Finally, put the live link at the top of the README.

> Render's free tier sleeps after about 15 minutes idle, so the first request
> takes ~30–50 seconds to wake it. Say so next to the link in your submission,
> or open the site yourself a minute before it is reviewed.

---

## Switching to Stripe

With a Stripe account in test mode:

1. On Render set `STRIPE_SECRET_KEY` (`sk_test_…`) and `STRIPE_PUBLISHABLE_KEY`
   (`pk_test_…`), and set **both** `DEMO_DEPLOYMENT` and `ALLOW_MOCK_PAYMENTS`
   to `false`. The server refuses to boot with Stripe configured and simulated
   payments still on, so this cannot be half-done.
2. Stripe → **Developers → Webhooks → Add endpoint**:
   `https://<service-name>.onrender.com/api/payments/webhook`, events
   `payment_intent.succeeded` and `payment_intent.payment_failed`. Copy the
   `whsec_…` into `STRIPE_WEBHOOK_SECRET`.
3. Health now reports `"payments":"stripe"`, the banner disappears, and checkout
   shows the real card form. Pay with `4242 4242 4242 4242`, any future expiry,
   any CVC.

No code changes. [`docs/stripe-integration.md`](docs/stripe-integration.md)
documents the integration itself.

---

## Troubleshooting

**The site loads but shows no products; the console shows a CORS error.**
`CLIENT_URL` on Render does not match the site's origin exactly — check the
scheme, and that there is no trailing slash. `npm run smoke` names the mismatch.

**Products load locally but not on Vercel; requests go to `/api` on vercel.app.**
`VITE_API_URL` was not set when the site was built. Set it and redeploy.

**The API will not start.** The log lists every problem. The usual ones are a
`MONGO_URI` with an un-encoded password, missing Cloudinary values, or only one
of the two demo flags set.

**`MongoServerSelectionError` in the log.** Atlas **Network Access** does not
include `0.0.0.0/0`.

**The first visit takes half a minute.** The free Render instance was asleep.
Nothing is wrong.
