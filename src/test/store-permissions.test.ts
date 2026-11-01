import { createClient } from '@supabase/supabase-js';
import { describe, it, expect } from 'vitest';
const url = process.env['SUPABASE_URL'];
const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
describe.skipIf(!url || !key)('Shared storefront permissions', () => {
  it('allows visitors to read the shared catalogue', async () => {
    if (!url || !key) return;
    const client = createClient(url, key, { auth: { persistSession: false }, global: { fetch: (input, init) => { const headers = new Headers(init?.headers); headers.delete('Authorization'); headers.set('apikey', key); return fetch(input, {...init,headers}); } } });
    const result = await client.from('products').select('id,name');
    expect(result.error).toBeNull();
    expect(result.data?.some(p => p.name === 'Ichiran Tonkotsu Ramen')).toBe(true);
  });
  it('rejects visitor product writes', async () => {
    if (!url || !key) return;
    const response = await fetch(`${url}/rest/v1/products`, { method:'POST', headers:{apikey:key,'Content-Type':'application/json'}, body:JSON.stringify({name:'Unauthorized write',category:'Ramen',price:1,image:'/products/chocolate.jpg'}) });
    expect(response.ok).toBe(false);
    expect([401,403]).toContain(response.status);
  });
});