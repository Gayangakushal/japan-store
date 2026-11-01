import { supabase } from '@/integrations/supabase/client';
import { queryOptions } from '@tanstack/react-query';

export const storeQuery = queryOptions({
  queryKey: ['store'],
  queryFn: async () => {
    const [products, settings] = await Promise.all([
      supabase.from('products').select('*').order('id'),
      supabase.from('store_settings').select('name,phone').eq('id', true).single(),
    ]);
    if (products.error) throw products.error;
    if (settings.error) throw settings.error;
    return { products: products.data, settings: settings.data };
  },
});

export const accountQuery = queryOptions({
  queryKey: ['account'],
  queryFn: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    const roles = await supabase.from('user_roles').select('role').eq('user_id', data.user.id);
    if (roles.error) throw roles.error;
    return { user: data.user, isAdmin: roles.data.some(r => r.role === 'admin') };
  },
});