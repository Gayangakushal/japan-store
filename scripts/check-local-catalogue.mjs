import { spawnSync } from "node:child_process";
// This check deliberately does not run migration preparation, migration tests, or live DB tests.
const changed = [
  "src/lib/local-catalogue.ts",
  "src/kumo/ProductImage.jsx",
  "scripts/preview-local-catalogue.mjs",
  "catalogue/ramen.json",
  "catalogue/ramen-images.json",
  "catalogue/README.md",
  "catalogue/IMAGE-AUDIT.md",
  "src/kumo/App.jsx",
  "src/kumo/ProductShowcase.jsx",
  "src/kumo/ProductDetails.jsx",
  "src/routes/__root.tsx",
  "src/test/local-catalogue.test.tsx",
  "src/test/ramen-catalogue.test.tsx",
  "catalogue/storefront-snapshot.json",
  "scripts/check-local-catalogue.mjs",
  "tsconfig.json",
];
const steps = [
  ["node_modules/prettier/bin/prettier.cjs", "--write", ...changed],
  [
    "node_modules/vitest/vitest.mjs",
    "run",
    "src/test/local-catalogue.test.tsx",
    "src/test/ramen-catalogue.test.tsx",
    "src/test/app-routing.test.tsx",
  ],
  ["node_modules/typescript/bin/tsc", "--noEmit"],
  [
    "node_modules/eslint/bin/eslint.js",
    "src/lib/local-catalogue.ts",
    "src/routes/__root.tsx",
    "src/test/local-catalogue.test.tsx",
    "src/test/ramen-catalogue.test.tsx",
  ],
  ["node_modules/vite/bin/vite.js", "build"],
  ["scripts/preview-local-catalogue.mjs"],
];
let failures = 0;
for (const args of steps) {
  console.log(`\nLOCAL CHECK ${args.join(" ")}`);
  const result = spawnSync(process.execPath, args, { stdio: "inherit", env: process.env });
  if (result.status !== 0) {
    failures++;
    console.error("Failed:", args[0], result.status, result.error?.message || "");
  }
}
process.exitCode = failures ? 1 : 0;
