# KUMO Japan Store

Japanese ramen, chocolate and beauty storefront built with React, TanStack Start, Vite and TypeScript. Products, category statuses and store settings are shared through Supabase. Customer shopping bags stay local to each browser.

## Run locally

Use Node.js 22 or newer.

```sh
npm ci
```

Copy `.env.example` to `.env`, then set your Supabase project URL, public publishable key and project ID. Never put a secret or service-role key in a frontend variable.

Follow [Supabase setup](supabase/SETUP.md) to create the database, image storage and the first authorised admin account. Existing configured projects do not need to be reseeded.

```sh
npm run dev
```

Open the Local URL printed by Vite.

## Store and administration

- Public storefront: `/`, including product details and related recommendations.
- Secure email/password sign-in: `/auth`.
- Role-protected live dashboard: `/admin`, with product editing, image uploads, stock/price filters, category launch controls and store settings.
- Offline design preview: `/admin-preview`. Its session-only drafts never update the live store.
- Beauty and Chocolate start as Coming soon; admins control their launch status.
- Japanese retail references are separate from LKR selling prices. Pending prices and out-of-stock products cannot be ordered.

Public store data refreshes on focus and every 30 seconds in active tabs. Database Row Level Security enforces admin-only writes. Admin roles are assigned through trusted management, never through public signup or browser metadata.

## Deploying

Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` and `VITE_SUPABASE_PROJECT_ID` in your hosting environment before building. Local `.env` files are excluded from Git and are not automatically uploaded. Replace any inherited settings for the old Lovable backend. If server-side `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` variables are present, they must target the same project.

Configure your deployed site and password-reset redirect URLs in Supabase Authentication. See [setup instructions](supabase/SETUP.md).

```sh
npm run build
```

## Verification

```sh
npm test -- --maxWorkers=1 --no-file-parallelism
npx tsc --noEmit
npm run build
node --env-file=.env scripts/check-supabase.mjs
node --env-file=.env scripts/verify-supabase-security.mjs
```

The last two commands require your configured Supabase project. Live admin sign-in and uploads must also be checked with an authorised account. `scripts/preview-kumo-ui.mjs` checks desktop/mobile layouts against a running `localhost:8080` using an isolated installed Windows Chrome profile and blocks remote writes.

## Product media

The catalogue retains verified local product photos and branded placeholders where a photo is unavailable. Admins can upload their own product images. Preserve documented photo licences and attribution: [catalogue guide](catalogue/README.md), [image audit](catalogue/IMAGE-AUDIT.md).

This project is connected to Lovable. Preserve published Git history when syncing changes.
