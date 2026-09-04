# Database Schema - Artisan's Corner

MongoDB with Mongoose. Seven collections model the marketplace: `users`,
`stores`, `categories`, `products`, `orders` (with embedded order items),
`reviews` and `payouts`.

## Entity relationship diagram

```mermaid
erDiagram
    USER ||--o| STORE : "owns (1:1, optional)"
    USER ||--o{ ORDER : "places as buyer"
    USER ||--o{ REVIEW : writes
    STORE ||--o{ PRODUCT : lists
    STORE ||--o{ PAYOUT : "is owed"
    CATEGORY ||--o{ PRODUCT : "classifies (by slug)"
    PRODUCT ||--o{ ORDER_ITEM : "is snapshotted in"
    PRODUCT ||--o{ REVIEW : receives
    ORDER ||--|{ ORDER_ITEM : "embeds (1..n)"
    ORDER ||--o{ PAYOUT : "generates one per vendor"
    ORDER ||--o{ REVIEW : "authorises (proof of purchase)"
    STORE ||--o{ ORDER_ITEM : fulfils

    USER {
        ObjectId _id
        string   name
        string   email UK
        string   password "bcrypt, select:false"
        string   role "buyer | vendor | admin"
        ObjectId store FK "null until onboarding"
        object   defaultShippingAddress
        boolean  isActive
        date     createdAt
    }

    STORE {
        ObjectId _id
        ObjectId owner FK UK "-> User"
        string   name
        string   slug UK
        string   description
        string   logo
        string   banner
        object   location "city, state, country"
        boolean  isActive
        number   totalSales
    }

    CATEGORY {
        ObjectId _id
        string   name UK
        string   slug UK
        string   image
        number   displayOrder
        boolean  isActive
    }

    PRODUCT {
        ObjectId _id
        string   name
        string   slug UK
        string   description
        number   price
        number   compareAtPrice
        string   category FK "-> Category.slug"
        array    images "url + Cloudinary publicId"
        ObjectId vendor FK "-> Store"
        ObjectId vendorUser FK "-> User"
        number   stock
        string   sku
        array    tags
        number   ratingAverage
        number   reviewCount
        number   unitsSold
        boolean  isActive
        boolean  isArchived "soft delete"
    }

    ORDER {
        ObjectId _id
        string   orderNumber UK
        ObjectId buyer FK "-> User"
        array    vendors FK "-> Store[]"
        object   shippingAddress
        number   subtotal
        number   shippingCost
        number   tax
        number   total
        number   commissionRate
        number   platformFee
        number   vendorEarnings
        string   paymentStatus "pending|paid|failed|refunded"
        string   stripePaymentIntentId
        date     paidAt
        string   orderStatus
        boolean  inventoryApplied "idempotency guard"
        array    statusHistory
    }

    ORDER_ITEM {
        ObjectId _id
        ObjectId product FK "-> Product"
        ObjectId vendor FK "-> Store"
        ObjectId vendorUser FK "-> User"
        string   productNameSnapshot
        string   imageSnapshot
        number   priceSnapshot "price at purchase"
        number   quantity
        number   subtotal
        number   commissionRate
        number   platformFee
        number   vendorEarnings
        string   fulfillmentStatus
        string   trackingNumber
        boolean  reviewed
    }

    REVIEW {
        ObjectId _id
        ObjectId product FK
        ObjectId user FK
        ObjectId order FK "proof of purchase"
        number   rating "1-5"
        string   title
        string   comment
        boolean  isVisible
    }

    PAYOUT {
        ObjectId _id
        ObjectId order FK
        string   orderNumber
        ObjectId vendor FK "-> Store"
        ObjectId vendorUser FK "-> User"
        number   grossSales
        number   commissionRate
        number   platformFee
        number   netEarnings
        string   status "pending|processing|paid|reversed"
        date     settledAt
    }
```

## Collection notes

### `users`
One account per person. `role` **adds** capability rather than replacing it: a
`vendor` keeps every buyer ability (cart, checkout, orders, reviews) and gains a
store. `store` is a back-reference filled in during onboarding. `password` is
bcrypt-hashed (cost 12) and excluded from queries by default (`select: false`),
and `toJSON` strips it even if it is explicitly selected.

**Indexes:** `email` (unique), `role`, `isActive`.

### `stores`
The public storefront. `owner` is unique, so a user can run at most one shop.
Setting `isActive: false` (by the vendor, or by an admin with a
`suspendedReason`) hides the storefront and every product it sells - checkout
rejects items from an inactive store.

**Indexes:** `owner` (unique), `slug` (unique), `isActive`, text index on
`name`/`description`.

### `categories`
A real collection rather than a hard-coded enum, so the taxonomy can be extended
without a redeploy. `products.category` stores the category **slug**, which keeps
marketplace filtering a single indexed equality match instead of a join.

### `products`
Owned by a store (`vendor`) and, denormalised for convenience, by a user
(`vendorUser`). Ownership is always taken from the authenticated session, never
from the request body, so a vendor cannot create or move a product into another
shop.

Deletion is soft where it matters: a product that appears in any order is
archived (`isArchived: true`) instead of deleted, so historical orders keep
resolving. Products that have never sold are deleted outright and their
Cloudinary images are removed.

**Indexes:** `slug` (unique), `category + price` (compound, for filtered
browsing), `vendor + isArchived`, `createdAt`, `isActive`, and a text index on
`name`/`description`/`tags`.

### `orders` and embedded order items
Order items are embedded rather than a separate collection: they are only ever
read with their parent order, and embedding makes the snapshot atomic.

Each item stores a **snapshot** of the product name, image and price at the time
of purchase. A later price change, rename or archive on the product therefore
cannot rewrite order history. The item also carries its own commission split, so
a multi-vendor order attributes every cent to the right shop.

`vendors` is a denormalised array of the distinct stores in the order, which lets
a vendor list "orders containing my products" with one indexed query.

`inventoryApplied` plus `paymentStatus` make order finalisation idempotent: the
Stripe webhook and the browser confirmation call the same code, and whichever
arrives second is a no-op.

**Indexes:** `orderNumber` (unique), `buyer + createdAt`, `items.vendor +
createdAt`, `paymentStatus + createdAt`, `stripePaymentIntentId` (sparse).

### `reviews`
`order` is the proof of purchase: a review can only be created when a **paid**
order belonging to that buyer contains that product. A compound unique index on
`(product, user)` allows one review per buyer per product, which can be edited
afterwards. Saving a review recomputes `ratingAverage` and `reviewCount` on the
product with an aggregation.

### `payouts`
The vendor earnings ledger. One row per `(order, vendor)` pair - enforced by a
compound unique index, which is also what makes payout creation idempotent. It
records gross sales, the commission rate applied, the platform fee and the net
amount owed. Actual bank transfers are out of scope; an admin marks a row
`paid` to simulate settlement.

## Money and commission

All amounts are stored in major units (dollars) rounded to two decimals, and
converted to minor units (cents) only when talking to Stripe.

```
item.subtotal       = priceSnapshot x quantity
item.platformFee    = round2(subtotal x commissionRate)     // default 5%
item.vendorEarnings = round2(subtotal - platformFee)        // absorbs rounding

order.subtotal      = sum(item.subtotal)
order.shippingCost  = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT_RATE
order.tax           = round2(subtotal x TAX_RATE)
order.total         = subtotal + shippingCost + tax
```

The commission is deducted from the vendor's earnings - it is never added to the
buyer's total. A $100 sale charges the buyer $100 (plus shipping/tax), records a
$5 platform fee and a $95 payout.
