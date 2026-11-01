import { readFileSync, writeFileSync, existsSync } from "node:fs";
const data = JSON.parse(readFileSync(new URL("../catalogue/ramen.json", import.meta.url), "utf8"));
if (
  data.length !== 50 ||
  new Set(data.map((p) => p.slug)).size !== 50 ||
  new Set(data.map((p) => p.catalogue_id)).size !== 50
)
  throw new Error("Expected 50 unique catalogue entries");
for (const p of data) {
  if (
    !p.name ||
    !p.brand ||
    !p.country ||
    p.category !== "Ramen" ||
    !Number.isFinite(p.price_jpy) ||
    p.price_jpy <= 0 ||
    !Number.isInteger(p.spicy_level) ||
    p.spicy_level < 0 ||
    p.spicy_level > 5
  )
    throw new Error(`Invalid product ${p.slug}`);
  if (
    !/^[-a-z0-9]+$/.test(p.slug) ||
    !["svg", "jpg", "webp"].some(
      (extension) => p.image === `/products/ramen/${p.slug}.${extension}`,
    ) ||
    !existsSync(new URL(`../public${p.image}`, import.meta.url))
  )
    throw new Error(`Invalid image ${p.slug}`);
}
if (JSON.stringify(data).includes("$catalogue$"))
  throw new Error("Seed contains the reserved SQL delimiter");
const template = readFileSync(new URL("../catalogue/ramen-migration.sql", import.meta.url), "utf8");
for (const name of ["0001_ramen_catalogue", "0002_ramen_catalogue_media_repair"]) {
  const file = new URL(`../drizzle/migrations/${name}.sql`, import.meta.url);
  writeFileSync(
    file,
    `-- ${name}: generated from catalogue/ramen-migration.sql and ramen.json.\n` +
      template.replace("__CATALOGUE_JSON__", () => JSON.stringify(data)),
  );
}
console.log(
  "Validated 50 unique catalogue records and generated migration/forward repair; no database changes.",
);
