import { supabase } from "@/integrations/supabase/client";
import type { StoreProduct } from "./local-catalogue";
import type { Json } from "@/integrations/supabase/types";
import type { CategoryStatus } from "./storefront-config";

export async function saveProduct(product: StoreProduct) {
  if (!product.name.trim() || !Number.isFinite(product.price) || product.price < 0)
    throw new Error("Enter a name and a valid selling price.");
  if (product.image.startsWith("data:")) throw new Error("Upload images to storage before saving.");
  const fields = {
    name: product.name.trim(),
    category: product.category,
    price: product.price,
    old: product.old ?? null,
    image: product.image,
    size: product.size || "",
    subtitle: product.subtitle || "",
    tag: product.tag || "",
    ramen: (product.ramen || null) as Json,
  };
  const query =
    typeof product.id === "number"
      ? supabase.from("products").update(fields).eq("id", product.id)
      : supabase.from("products").insert(fields);
  const { error } = await query.select("id").single();
  if (error) throw new Error(error.message);
}
export async function deleteProduct(product: StoreProduct) {
  if (typeof product.id !== "number") throw new Error("This product has not been saved.");
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", product.id)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
}
export async function saveCategories(categories: CategoryStatus) {
  const { error } = await supabase
    .from("categories")
    .upsert(Object.entries(categories).map(([name, status]) => ({ name, status })))
    .select();
  if (error) throw new Error(error.message);
}
export async function saveSettings(settings: { name: string; phone: string }) {
  const { error } = await supabase
    .from("store_settings")
    .update(settings)
    .eq("id", true)
    .select()
    .single();
  if (error) throw new Error(error.message);
}
export async function uploadProductImage(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024)
    throw new Error("Choose a JPG, PNG or WebP smaller than 5 MB.");
  const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
  const path = `products/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);
  return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
}
