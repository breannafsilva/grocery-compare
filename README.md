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
KROGER_AUTH_BASE_URL=https://api-ce.kroger.com/v1/connect/oauth2/token
KROGER_API_BASE_URL=https://api-ce.kroger.com/v1/products
KROGER_LOCATION_ID=53100508
KROGER_SCOPE=product.compact
NEXT_PUBLIC_DEFAULT_POSTAL_CODE=60647
```

`KROGER_AUTH_BASE_URL`, `KROGER_API_BASE_URL`, `KROGER_LOCATION_ID`,
`KROGER_SCOPE`, and `NEXT_PUBLIC_DEFAULT_POSTAL_CODE` are non-secret
certification defaults committed through the Cloudflare/Vite Worker config.
Keep `KROGER_CLIENT_ID` and `KROGER_CLIENT_SECRET` in local `.dev.vars` or
Cloudflare/Azure secret storage.

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
- `npm run deploy:cloudflare`: build and deploy to the `compare-grocer` Cloudflare Worker

## Deployment

Azure DevOps CI/CD is defined in `azure-pipelines.yml`. See
`docs/deployment.md` for the Azure secret setup, Cloudflare token permissions,
and public/private access notes.
