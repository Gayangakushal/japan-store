import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

// A temporary QA tool, outside package.json. Never reads cloud environment variables.
const modulePath = join(
  tmpdir(),
  "kumo-catalogue-qa/node_modules/@electric-sql/pglite/dist/index.js",
);
const { PGlite } = await import(pathToFileURL(modulePath).href);
const db = new PGlite(); // memory only; no connection to Supabase or the production database
const read = (name) => readFileSync(new URL(`../${name}`, import.meta.url), "utf8");
try {
  await db.exec(
    `CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY); CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS 'SELECT NULL::uuid';`,
  );
  await db.exec(read("drizzle/migrations/0000_kumo_shared_store.sql"));
  const original = (
    await db.query(
      "SELECT id,name,subtitle,category,price,old,size,tag,created_at FROM products ORDER BY id",
    )
  ).rows;
  const policies = (
    await db.query(
      "SELECT policyname,cmd,qual,with_check FROM pg_policies ORDER BY tablename,policyname",
    )
  ).rows;
  const files = ["0001_ramen_catalogue", "0002_ramen_catalogue_media_repair"];
  async function apply(name) {
    await db.transaction(async (tx) => {
      await tx.exec(read(`drizzle/migrations/${name}.sql`));
    });
  }
  await apply(files[0]);
  await apply(files[0]);
  // Simulate a previously applied v1 seed whose metadata still points at SVGs.
  await db.exec(
    `UPDATE products SET ramen=jsonb_set(ramen,'{image}',to_jsonb('/products/ramen/'||(ramen->>'slug')||'.svg')) WHERE ramen IS NOT NULL`,
  );
  await apply(files[1]);
  await apply(files[1]);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM products")).rows[0].n, 57);
  assert.equal(
    (await db.query("SELECT count(*)::int AS n FROM products WHERE ramen IS NOT NULL")).rows[0].n,
    50,
  );
  assert.deepEqual(
    (
      await db.query(
        "SELECT id,name,subtitle,category,price,old,size,tag,created_at FROM products WHERE id<=8 ORDER BY id",
      )
    ).rows,
    original,
  );
  const entries = JSON.parse(read("catalogue/ramen.json"));
  for (const item of entries)
    assert.equal(
      (
        await db.query(
          "SELECT ramen->>'image' AS image FROM products WHERE ramen->>'catalogue_id'=$1",
          [item.catalogue_id],
        )
      ).rows[0].image,
      item.image,
    );
  for (const p of entries)
    assert.equal(
      (
        await db.query("SELECT count(*)::int AS n FROM products WHERE ramen->>'catalogue_id'=$1", [
          p.catalogue_id,
        ])
      ).rows[0].n,
      1,
    );
  // Preserve future products and administrator edits on rerun; repair must not rely on a global count.
  const custom = {
    ...entries[0],
    catalogue_id: "custom-unrelated",
    slug: "custom-unrelated",
    image: "/products/custom.webp",
  };
  await db.query("INSERT INTO products(name,category,price,image,ramen) VALUES ($1,$2,$3,$4,$5)", [
    "Independent ramen",
    "Ramen",
    900,
    "/products/custom.webp",
    JSON.stringify(custom),
  ]);
  await db.exec(
    `UPDATE products SET ramen=ramen||'{"price_jpy":777,"unit":"1 packet (custom confirmed)","image":"/products/admin-approved.webp","slug":"admin-renamed-ichiran"}'::jsonb WHERE name='Ichiran Tonkotsu Ramen';`,
  );
  await apply(files[1]);
  const edited = (await db.query("SELECT ramen FROM products WHERE name='Ichiran Tonkotsu Ramen'"))
    .rows[0].ramen;
  assert.equal(edited.price_jpy, 777);
  assert.equal(edited.image, "/products/admin-approved.webp");
  assert.equal(edited.unit, "1 packet (custom confirmed)");
  assert.equal((await db.query("SELECT count(*)::int AS n FROM products")).rows[0].n, 58);
  await assert.rejects(
    db.exec("UPDATE products SET ramen='{\"catalogue_id\":null}'::jsonb WHERE id=1"),
  );
  await assert.rejects(
    db.query("INSERT INTO products(name,category,price,image,ramen) VALUES ($1,$2,$3,$4,$5)", [
      "Duplicate",
      "Ramen",
      1,
      "/test.jpg",
      JSON.stringify(entries[0]),
    ]),
  );
  assert.deepEqual(
    (
      await db.query(
        "SELECT policyname,cmd,qual,with_check FROM pg_policies ORDER BY tablename,policyname",
      )
    ).rows,
    policies,
  );
  await db.exec("SET ROLE anon");
  assert.equal((await db.query("SELECT count(*)::int AS n FROM products")).rows[0].n, 58);
  await assert.rejects(
    db.exec(
      "INSERT INTO products(name,category,price,image) VALUES ('Unauthorized','Ramen',1,'/test.jpg')",
    ),
  );
  await db.exec("RESET ROLE");
  console.log(
    "PASS: in-memory PostgreSQL migration/repair reruns; 50 exact identities; 57 original+seed rows; LKR/data preservation; custom edits; unrelated entries; constraints; unchanged RLS and anonymous write rejection. No production database contacted.",
  );
} finally {
  await db.close();
}
