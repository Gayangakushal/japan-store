import { supabase } from "@/integrations/supabase/client";
import { queryOptions } from "@tanstack/react-query";
import type { CategoryStatus } from "./storefront-config";
import type { StoreProduct } from "./local-catalogue";

export const storeQuery = queryOptions({
  queryKey: ["store"],
  queryFn: async () => {
    const [products, settings, categories] = await Promise.all([
      supabase.from("products").select("*").order("id"),
      supabase.from("store_settings").select("name,phone").eq("id", true).single(),
      supabase.from("categories").select("name,status"),
    ]);
    for (const result of [products, settings, categories])
      if (result.error) throw new Error(result.error.message);
    if (!products.data || !settings.data || !categories.data)
      throw new Error("Store setup is incomplete.");
    return {
      products: products.data as unknown as StoreProduct[],
      settings: settings.data,
      categories: Object.fromEntries(
        categories.data.map((c) => [c.name, c.status]),
      ) as CategoryStatus,
    };
  },
  staleTime: 0,
  refetchInterval: 30_000,
  refetchIntervalInBackground: false,
  retry: 1,
});

export const accountQuery = queryOptions({
  queryKey: ["account"],
  staleTime: 0,
  queryFn: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    const roles = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
    if (roles.error) throw new Error(roles.error.message);
    return { user: data.user, isAdmin: roles.data.some((r) => r.role === "admin") };
  },
});
