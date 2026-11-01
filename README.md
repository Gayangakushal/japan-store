# KUMO Japan Store

The existing KUMO storefront, built with React, TanStack Start, Vite and TypeScript. The ramen catalogue runs from local frontend JSON without a production database connection.

## Run locally

Use Node.js 22 or newer and npm.

```sh
npm ci
npm run dev
```

Open the Local URL printed by Vite. The public catalogue does not require a `.env` file. Existing admin/auth features are optional and require your own configured backend; see `.env.example`. Never commit credentials.

## Catalogue

- All 50 requested ramen products display by default in the existing responsive grid.
- 27 verified local packet/cup photos and 23 unique branded placeholders.
- Name/brand search, country/brand/heat filters, sorting and product details.
- Estimated Japanese retail prices are shown separately in JPY with pack units.
- Existing checked-in LKR prices and cart/WhatsApp checkout logic are preserved.
- JSON-only catalogue items cannot be added to the bag.
- Existing products are matched by stable catalogue ID, slug or normalized name to prevent duplicate cards.

Data: `catalogue/ramen.json`. Existing commercial snapshot: `catalogue/storefront-snapshot.json`.

Read the [catalogue guide](catalogue/README.md) and the [exact image audit](catalogue/IMAGE-AUDIT.md). Individual photos retain their documented CC licences and attribution; those licences do not imply a licence for all project code.

## Verification

```sh
node scripts/check-local-catalogue.mjs
```

This runs the scoped local tests, TypeScript, changed-file lint, production build and an installed-Chrome browser check. The Chrome step currently expects Windows Google Chrome in its standard installation path. It blocks non-local requests, verifies 50 unique decodable assets, and checks desktop/mobile layouts. It does not run migration or live database tests.

The latest local verification passed 12 tests, type checking, changed-file lint and production build. Browser checks confirmed 50 catalogue cards, four desktop columns, two mobile columns, no horizontal overflow and zero database requests.

Existing migration files are retained for separately reviewed future backend work. Do not run migration preparation or apply migrations as part of local catalogue setup. Publishing/deployment and database rollout require separate approval. No GitHub deployment workflow is included.
