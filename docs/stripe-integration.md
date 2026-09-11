# Stripe integration — what is built, and why there are no keys

The brief asks for Stripe in test mode. The integration is **complete and
tested**. What is missing is not code: it is a Stripe *account*, which Stripe
will not issue to this developer. This page shows the whole payment path, the
tests that prove each part of it, and the exact step that turns it on.

---

## Why there are no keys

Stripe does not accept open sign-ups in India. Selecting India on the sign-up
form returns:

> Stripe is available by invite only in India. Please request an invitation to
> onboard in India.

Requesting that invitation leads to an onboarding questionnaire that asks for:

> Do you have business registration documents? Please attach a copy of your
> company PAN, GSTIN or CIN documentation.
> **Note: if you do not have this yet, Stripe may not be able to support your
> business at this time.**

This project is a student's academic submission, not a registered company, so
it cannot satisfy that requirement — and fabricating registration documents for
a payments company is not an option. No account means no API keys, including
test keys, which are only issued from inside an account.

**Anyone holding Stripe test keys can switch this application onto the real
card form in under a minute.** See [Turning it on](#turning-it-on).

---

## The payment path, end to end

| Step | Where | What happens |
| --- | --- | --- |
| 1. Price the basket | [`services/pricing.service.js`](../backend/services/pricing.service.js) | The browser sends only `{productId, quantity}`. Every price, the 5% commission and the shipping rule are computed on the server. |
| 2. Create the intent | [`controllers/payment.controller.js:38`](../backend/controllers/payment.controller.js#L38) | `stripe.paymentIntents.create()` for the server-computed total in minor units, with the order id in `metadata` so a webhook can find it later. The response carries the **client secret and publishable key only**. |
| 3. Collect the card | [`components/StripeCheckout.jsx`](../frontend/src/components/StripeCheckout.jsx) | Stripe's own `<Elements>` + `<PaymentElement>`. Card details are entered in Stripe's iframe and never touch this application or its server. |
| 4. Confirm | [`controllers/payment.controller.js:132`](../backend/controllers/payment.controller.js#L132) | The server **re-reads the intent from Stripe** rather than trusting the browser's word that payment succeeded, then finalises the order. |
| 5. Webhook | [`controllers/payment.controller.js:175`](../backend/controllers/payment.controller.js#L175) | `stripe.webhooks.constructEvent()` verifies the signature against the raw body — mounted before the JSON parser in [`app.js:48`](../backend/app.js#L48) precisely so the bytes Stripe signed are the bytes verified. |
| 6. Finalise once | [`services/order.service.js`](../backend/services/order.service.js) | `finalizePaidOrder` is idempotent: the webhook and the browser confirmation can both arrive, in either order, and stock is decremented and payouts recorded exactly once. |

The secret key is loaded in one file, [`config/stripe.js`](../backend/config/stripe.js),
and never leaves the server. An audit check fails the build if a Stripe secret
ever appears in the built client bundle.

---

## What the tests prove

`backend/tests/stripe.test.js` — 17 tests. The Stripe *client* is mocked so no
network call is made, but **webhook signatures are verified with the real
`stripe` library**, using its own `generateTestHeaderString` to sign the
fixtures. The signature checks are therefore genuine, not simulated.

```
npm --prefix backend test -- tests/stripe.test.js
```

```
√ charges the server-computed total in minor units
√ ignores a price supplied by the browser
√ tags the intent so a webhook can find the order
√ returns the client secret and publishable key, never the secret key
√ leaves the order unpaid until payment actually succeeds
√ refuses to price a basket that exceeds stock before reaching Stripe
√ re-reads the intent from Stripe rather than trusting the browser
√ does not pay the order when Stripe says the card was declined
√ holds the order open while Stripe is still processing
√ rejects simulated payments when Stripe is configured
√ accepts an authentically signed event and finalises the order
√ rejects a forged signature and leaves the order untouched
√ rejects a payload tampered with after signing
√ rejects an unsigned request
√ marks the order failed on payment_intent.payment_failed
√ is idempotent across the webhook and the browser confirmation
√ ignores an event for an order it does not know

Tests: 17 passed, 17 total
```

Note the tenth: **`rejects simulated payments when Stripe is configured`**. The
development fallback cannot be used as a way around Stripe once keys exist.

---

## Turning it on

Three values in `backend/.env`, from any Stripe account's test mode:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...      # optional, see below
```

Restart, then:

```bash
npm run check:services      # opens and cancels a real test PaymentIntent
```

`GET /api/health` flips from `"payments":"mock"` to `"payments":"stripe"`, and
checkout step 3 renders the real card form. Test cards:

| Card | Expected |
| --- | --- |
| `4242 4242 4242 4242` | Succeeds |
| `4000 0025 0000 3155` | 3D Secure challenge, then succeeds |
| `4000 0000 0000 0002` | Declined — no order is created |

The webhook secret is optional locally: confirmation already re-reads the intent
from Stripe, so orders complete without it. To exercise the webhook path, run
`stripe listen --forward-to localhost:5055/api/payments/webhook` and paste the
`whsec_` it prints.

**No code changes are required at any point.**

---

## What runs in the meantime

With no keys, checkout uses a simulated provider that is labelled as such in the
UI ("Simulated payment mode") and rejected outright in production
([`config/env.js`](../backend/config/env.js) refuses to boot without a Stripe
secret when `NODE_ENV=production`).

Everything around the payment is real: the server-computed total, the 5%
commission split, the per-vendor payout ledger, the conditional stock
decrement, the order snapshots and the cancellation/restock path. Only the card
charge itself is stubbed — which is exactly the part Stripe's test mode would
also stub, with the difference being whose servers say "succeeded".
