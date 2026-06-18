# Grocery Compare

Grocery Compare builds a shopping list, compares item prices across Mariano's,
Jewel-Osco, and Costco, and shows either the best split-store route or the best
single-store value.

## Features

- Editable price book for grocery items and stores
- Bulk-pack math for Costco-style package sizes
- Best split-store and best one-store comparisons
- Live pricing sync layer with source status notes
- Sale, coupon, membership, live, manual, and estimate badges

## Live Pricing

Live pricing is provider-based because grocery prices vary by exact store,
loyalty account, pickup/delivery channel, membership, coupons, and weekly sales.

Current provider support:

- Mariano's: wired for the official Kroger Product API when credentials are set.
- Jewel-Osco: placeholder status until an approved Albertsons/Jewel source is
  connected.
- Costco: placeholder status until an approved member-price source is connected.

Create `.env` from `.env.example` to enable Mariano's:

```bash
KROGER_CLIENT_ID=
KROGER_CLIENT_SECRET=
KROGER_LOCATION_ID=
KROGER_SCOPE=product.compact
NEXT_PUBLIC_DEFAULT_POSTAL_CODE=60601
```

Sales are noted when the provider returns a promo price. Digital coupons are
not applied unless a connected provider returns them. Costco membership is
assumed and labeled in the UI.

## Prerequisites

- Node.js `>=22.13.0`

## Quick Start

```bash
npm install
npm run dev
npm run build
```

## Useful Commands

- `npm run dev`: start local development
- `npm run build`: verify the vinext build output
- `npm run lint`: run ESLint
