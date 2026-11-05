// Read-only checks first; write checks target a nonexistent category only.
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error('Missing Supabase public configuration.');
const headers = { apikey: key, 'Content-Type': 'application/json' };
let passed = true;
for (const table of ['products', 'categories', 'store_settings']) {
  const read = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, { headers, signal: AbortSignal.timeout(15000) });
  console.log(`Public ${table} read: ${read.status}`);
  if (!read.ok) passed = false;
}
// No real record matches this selector, even if permissions are misconfigured.
for (const method of ['PATCH', 'DELETE']) {
  const response = await fetch(`${url}/rest/v1/categories?name=eq.__kumo_permission_probe__`, {
    method, headers, ...(method === 'PATCH' ? { body: JSON.stringify({ status: 'active' }) } : {}),
    signal: AbortSignal.timeout(15000),
  });
  const rejected = [401, 403].includes(response.status);
  console.log(`Anonymous ${method} denied: ${rejected} (${response.status})`);
  if (!rejected) passed = false;
}
const roles = await fetch(`${url}/rest/v1/user_roles?select=user_id&limit=1`, { headers, signal: AbortSignal.timeout(15000) });
const privateRoles = [401, 403].includes(roles.status);
console.log(`Anonymous role listing denied: ${privateRoles} (${roles.status})`);
if (!privateRoles) passed = false;
process.exitCode = passed ? 0 : 1;
