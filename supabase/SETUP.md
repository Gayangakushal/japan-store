# KUMO Supabase setup

The app is configured locally for project `bawvmryvyddlxuikiarb`. No secret key is required by the website.

1. Open https://supabase.com/dashboard/project/bawvmryvyddlxuikiarb/sql/new
2. Copy the entire contents of `supabase/setup.sql` into the SQL Editor and run it. This creates the tables, role checks, storage bucket, policies and 57 product records. It preserves existing rows if run again. Use this file for the new standalone project; do not additionally run the older Lovable migrations.
3. In Authentication > Users, choose Add user > Create new user. Set your admin email and a strong password, and confirm the email. Do not share the password in chat.
4. Open `supabase/create-admin.sql`, replace `REPLACE_WITH_YOUR_ADMIN_EMAIL` with that exact email, and run the SQL. Only this trusted dashboard operation grants admin access.
5. In Authentication > URL Configuration, set Site URL to your deployed website origin. Add your exact deployed `/auth` and `/reset-password` URLs to Redirect URLs. For local development add `http://localhost:3000/auth` and `http://localhost:3000/reset-password` (adjust the port if Vite prints another port).
6. If this store has no public customer sign-up, disable new public sign-ups in Supabase Authentication settings. Admin users are created through the dashboard.
7. Restart the dev server after changing `.env`. In your hosting environment set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to the supplied public project values, then rebuild/redeploy. If runtime `SUPABASE_URL` or `SUPABASE_PUBLISHABLE_KEY` variables exist, update them to the same project too. Local `.env` is not automatically copied to hosting.
8. Visit `/auth`, sign in, and open `/admin`. Set the store's WhatsApp number, verify prices/availability, upload product images and control category status. `/admin-preview` remains a separate offline demo.

## Verification

Run `node --env-file=.env scripts/check-supabase.mjs` to verify that email auth and all public tables are reachable. Then run `node --env-file=.env scripts/verify-supabase-security.mjs` to confirm public catalogue reads work and anonymous writes are denied. The latter attempts update/delete operations only against a nonexistent category; it never changes a real category.

Test a live admin save and image upload after the SQL setup, then open the store in a private browser window. Public data refreshes on focus and every 30 seconds while the tab is active. Deleted products must stay deleted after refresh. Customer bags remain local to each browser.

Database setup and admin creation cannot be executed with a publishable key. These steps require the Supabase dashboard owner. Never paste secret or service-role keys into frontend environment variables.
