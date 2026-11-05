const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error('Set the Supabase URL and publishable key in .env.');
for (const path of ['/auth/v1/settings', '/rest/v1/products?select=id&limit=1', '/rest/v1/categories?select=name,status', '/rest/v1/store_settings?select=name,phone']) {
  try {
    const response = await fetch(url + path, { headers: { apikey: key }, signal: AbortSignal.timeout(15000) });
    const data = await response.json();
    console.log(path, response.status, path.includes('/auth/') ? { emailEnabled: data.external?.email, error: data.message } : data);
  } catch (error) { console.log(path, error.message); }
}
