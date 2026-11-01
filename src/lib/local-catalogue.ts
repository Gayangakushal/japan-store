import catalogue from "../../catalogue/ramen.json";
import snapshot from "../../catalogue/storefront-snapshot.json";

export type RamenEntry = (typeof catalogue)[number];
export type StoreProduct = {
  id: number | string;
  name: string;
  category: string;
  price: number;
  old?: number | null;
  image: string;
  size?: string;
  subtitle?: string;
  tag?: string;
  ramen?: {
    catalogue_id?: string;
    slug?: string;
    availability?: string;
    [key: string]: unknown;
  } | null;
  catalogueOnly?: boolean;
};
export type LocalStore = { products: StoreProduct[]; settings: { name: string; phone: string } };
export const localStoreSnapshot: LocalStore = snapshot;
export const ramenCatalogue = catalogue;
const normalize = (name: string) =>
  name.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();

/** Pure frontend composition. No Supabase imports, network calls, writes, or JPY-to-LKR conversion. */
export function buildLocalCatalogue(
  existing: readonly StoreProduct[] = snapshot.products,
): StoreProduct[] {
  const byId = new Map(catalogue.map((entry) => [entry.catalogue_id, entry]));
  const bySlug = new Map(catalogue.map((entry) => [entry.slug, entry]));
  const byName = new Map(catalogue.map((entry) => [normalize(entry.name), entry]));
  const seen = new Set<string>();
  const products: StoreProduct[] = [];
  for (const product of existing) {
    const entry =
      product.category === "Ramen"
        ? byId.get(product.ramen?.catalogue_id || "") ||
          bySlug.get(product.ramen?.slug || "") ||
          byName.get(normalize(product.name))
        : undefined;
    if (!entry) {
      products.push({ ...product });
      continue;
    }
    if (seen.has(entry.catalogue_id)) continue;
    seen.add(entry.catalogue_id);
    // Keep the real row's ID, LKR price and commercial fields. JSON supplies reference metadata only.
    products.push({
      ...product,
      ramen: { ...entry, availability: product.ramen?.availability || entry.availability },
      catalogueOnly:
        product.catalogueOnly === true ||
        (typeof product.id === "string" && product.id.startsWith("catalogue:")),
    });
  }
  for (const entry of catalogue) {
    if (seen.has(entry.catalogue_id)) continue;
    products.push({
      id: `catalogue:${entry.catalogue_id}`,
      name: entry.name,
      category: entry.category,
      price: 0,
      old: null,
      image: entry.image,
      size: entry.unit,
      subtitle: entry.description,
      tag: "CATALOGUE",
      ramen: { ...entry },
      catalogueOnly: true,
    });
    seen.add(entry.catalogue_id);
  }
  // Present the requested collection in its JSON order, with existing non-catalogue
  // finds still available below it and through their category filters.
  const matched = new Map(
    products
      .filter((product) => product.ramen?.catalogue_id && byId.has(product.ramen.catalogue_id))
      .map((product) => [product.ramen!.catalogue_id, product]),
  );
  return [
    ...catalogue.map((entry) => matched.get(entry.catalogue_id)!),
    ...products.filter(
      (product) => !product.ramen?.catalogue_id || !byId.has(product.ramen.catalogue_id),
    ),
  ];
}

/** A reference-only JSON record never becomes sellable just because its JPY value is positive. */
export function canAddToBag(product: StoreProduct): boolean {
  return (
    !product.catalogueOnly &&
    (!product.ramen || (Number.isFinite(product.price) && product.price > 0))
  );
}
