import type { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
export async function signOut(queryClient: QueryClient) {
  await queryClient.cancelQueries();
  queryClient.clear();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}