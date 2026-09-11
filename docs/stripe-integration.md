# Stripe integration

The brief asks for Stripe in test mode, using the PaymentIntent flow. That is
what runs — locally and on the live deployment — against a real Stripe
sandbox. This page walks the payment path file by file, lists the tests behind
it, and records the end-to-end verification against Stripe itself.

---

## Verified against real Stripe

Both runs used Stripe's test card `4242 4242 4242 4242` in real Chrome, typed
into Stripe's own card form, and were then checked on both sides — in Stripe,
and in this application's database.

| | Local (`npm run dev`) | Live (<https://artisans-corner-keshav.vercel.app>) |
| --- | --- | --- |
| Stripe card form loaded in its iframe | yes | yes |
| Order confirmed, cart emptied | `AC-MTXD5R54-7TIJ` | `AC-MTXDF4VR-0A2L` |
| PaymentIntent status in Stripe | `succeeded`, $47.00 USD | `succeeded`, $33.00 USD |
| Order recorded as paid, with charge id | yes | yes |
| Commission split recorded | $2.10 platform / $39.90 vendor | $1.40 platform / $26.60 vendor |
| `payment_intent.succeeded` webhook | not configured locally | delivered, acknowledged with 2xx |

The split is 5% of the merchandise subtotal; shipping is not commissioned.

Reproduce it against any running site with Stripe keys:

```bash
npm run stripe:checkout                                           # local
SITE=https://artisans-corner-keshav.vercel.app npm run stripe:checkout   # live
```

It signs in as the demo buyer and makes a real **test-mode** payment, so it
creates a paid order in whichever database that site uses. No money moves.

---

## The payment path, end to end

| Step | Where | What happens |
| --- | --- | --- |
| 1. Price the basket | [`services/pricing.service.js`](../backend/services/pricing.service.js) | The browser sends only `{productId, quantity}`. Every price, the 5% commission and the shipping rule are computed on the server. |
| 2. Create the intent | [`controllers/payment.controller.js`](../backend/controllers/payment.controller.js) — `createPaymentIntent` | `stripe.paymentIntents.create()` for the server-computed total in minor units, with the order id in `metadata` so a webhook can find it later. The response carries the **client secret and publishable key only**. |
| 3. Collect the card | [`components/StripeCheckout.jsx`](../frontend/src/components/StripeCheckout.jsx) | Stripe's own `<Elements>` + `<PaymentElement>`. Card details are entered in Stripe's iframe and never touch this application or its server. |
| 4. Confirm | `confirmPayment` in the same controller | The server **re-reads the intent from Stripe** rather than trusting the browser's word that payment succeeded, then finalises the order and the client clears the cart. |
| 5. Webhook | `handleWebhook` in the same controller | `stripe.webhooks.constructEvent()` verifies the signature against the raw body — mounted before the JSON parser in [`app.js`](../backend/app.js) precisely so the bytes Stripe signed are the bytes verified. |
| 6. Finalise once | [`services/order.service.js`](../backend/services/order.service.js) | `finalizePaidOrder` is idempotent: the webhook and the browser confirmation can both arrive, in either order, and stock is decremented and payouts recorded exactly once. |

The secret key is loaded in one file, [`config/stripe.js`](../backend/config/stripe.js),
and never leaves the server. An audit check fails the build if a Stripe secret
ever appears in the built client bundle.

---

## What the tests prove

`backend/tests/stripe.test.js` — 17 tests. The Stripe *client* is mocked so the
suite never calls Stripe, but **webhook signatures are verified with the real
`stripe` library**, using its own `generateTestHeaderString` to sign the
fixtures, so the signature checks are genuine.

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

The automated suites deliberately run with every Stripe key blanked, so no test
run can ever reach a real account. Stripe's own card form is covered instead by
`npm run stripe:checkout` above.

---

## Configuration

From any Stripe account's **test mode** (sandbox):

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Locally the webhook secret is optional: confirmation re-reads the intent from
Stripe, so orders complete without it. On the deployment it comes from a webhook
destination pointing at `https://<api>/api/payments/webhook` with the events
`payment_intent.succeeded` and `payment_intent.payment_failed`.

`npm run check:services` then opens and cancels a real test PaymentIntent, and
`GET /api/health` reports `"payments":"stripe"`. Test cards:

| Card | Expected |
| --- | --- |
| `4242 4242 4242 4242` | Succeeds |
| `4000 0025 0000 3155` | 3D Secure challenge, then succeeds |
| `4000 0000 0000 0002` | Declined — no order is created |

---

## Without Stripe keys

For a machine with no Stripe account, `ALLOW_MOCK_PAYMENTS=true` replaces the
card form with a clearly labelled simulated payment; the server-computed total,
commission split, payout ledger, stock movement and order snapshots all still
happen for real. Production refuses it unless `DEMO_DEPLOYMENT=true` is also
set — in which case the site shows a banner saying payments are simulated — and
refuses it outright once Stripe keys are configured, so the two can never be
mixed.
