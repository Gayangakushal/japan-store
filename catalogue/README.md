# Local ramen catalogue

The public storefront now displays all 50 products directly from `catalogue/ramen.json`. Opening `/` does not fetch Supabase products/settings, query account roles, or initialize the root cloud-auth listener. No production database connection, migration change, migration application, or deployment was performed for this task.

## Data, existing prices, and checkout

`src/lib/local-catalogue.ts` is a pure frontend adapter. It combines the 50 reference entries with `storefront-snapshot.json`, which copies the eight products and LKR prices already checked into migration 0000. The snapshot was read from the existing project file, not fetched from production. If a store result is already present in the in-memory QueryClient cache (for example after an explicit visit to an existing management route), that data is reused without a new request.

Matches use catalogue ID, slug or normalized product name. Each requested ramen identity gets one card. Its existing numeric ID, LKR selling price and commercial fields are retained. The initial local snapshot yields 57 total cards: the 50 requested ramen entries (including the existing Ichiran) and seven other existing products. The two legacy ramen products outside the requested list are preserved.

New JSON-only records use stable `catalogue:` IDs and `catalogueOnly: true`. Add to Bag is disabled on both cards and details and guarded in the add handler, even if someone puts a positive selling price on a reference-only object. JPY values are never treated as LKR selling prices or converted for the cart. Existing cart IDs, quantity changes, LKR subtotal formatting and WhatsApp message construction are retained. New items must become real commercial records with configured selling price and confirmed stock before ordering is enabled; the local JSON is a reference catalogue, not an inventory system.

The checked-in store name/phone snapshot is KUMO with an empty phone, matching the original seed. Already-cached settings retain their existing name/phone. The agent has not read production settings or current production prices. Existing protected admin/auth routes remain available when explicitly visited; they are not needed by the local public catalogue.

## Display and filtering

All products display by default in the existing responsive grid: four columns on desktop and two on mobile. The optional Products per page control supports All, 12 and 24. Existing name/brand search, country, brand, heat (including 0), JPY sorting, saved products, category/collection controls and the existing detail modal remain in place. Each catalogue card shows brand, country, flavor, heat and the separately labelled Estimated Japan retail price with its pack unit.

## Images

See [IMAGE-AUDIT.md](IMAGE-AUDIT.md) for the exact real-photo/placeholder list and source licences. [ramen-images.json](ramen-images.json) maps all 50 stable IDs to unique local assets and fallbacks. The original 26 verified photos are retained. Additional candidates were researched by exact product name through image search, official manufacturer pages and Wikimedia. Only matching, reuse-licensed photos are published; the rest remain unique branded SVG placeholders. No Google thumbnails, generated packets or generic ramen bowls are used as catalogue product photos.

ProductImage applies the same mapping in cards, details, bag, promotions and admin. Visible attribution and licence links are included beside photos and in `/products/ramen/credits.html`. Decorative collection/banner photography is separate from product images. New JPEGs are at most 600px and quality 85; no raster processing package was added to the application.

## Local verification

Run `node scripts/check-local-catalogue.mjs`. It runs scoped formatting, the local DOM/unit tests, TypeScript, changed-file lint, production build, and a headless installed-Chrome check. It deliberately excludes migration generation, migration tests and live Supabase tests.

The browser check starts a temporary localhost Vite server, blocks all non-local requests, checks all 50 catalogue cards and unique decodable image assets, verifies four desktop columns/two mobile columns without horizontal overflow, writes screenshots under `.local-catalogue-qa/`, and closes its own browser/server. This QA folder and raw research downloads are ignored by version control.

The prior migration/repair SQL and journal are left untouched for a separately approved future backend rollout. Do not run the older `check-ramen-catalogue.mjs` for this local-only task because it prepares SQL and runs local migration tests. No database rollout is required to display the catalogue now.
