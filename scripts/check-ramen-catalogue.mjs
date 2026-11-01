import { spawnSync } from "node:child_process";
const changed = [
  "src/kumo/App.jsx",
  "src/kumo/ProductShowcase.jsx",
  "src/kumo/ProductImage.jsx",
  "src/kumo/ProductDetails.jsx",
  "src/kumo/products.css",
  "src/routes/_authenticated/admin.tsx",
  "src/test/ramen-catalogue.test.tsx",
  "scripts/prepare-ramen-catalogue.mjs",
  "scripts/verify-ramen-migrations.mjs",
  "scripts/check-ramen-catalogue.mjs",
  "catalogue/ramen.json",
  "catalogue/ramen-images.json",
  "catalogue/README.md",
  "catalogue/IMAGE-AUDIT.md",
  "drizzle/migrations/meta/_journal.json",
];
const steps = [
  ["scripts/prepare-ramen-catalogue.mjs"],
  ["node_modules/prettier/bin/prettier.cjs", "--write", ...changed],
  ["scripts/verify-ramen-migrations.mjs"],
  ["node_modules/vitest/vitest.mjs", "run"],
  ["node_modules/typescript/bin/tsc", "--noEmit"],
  [
    "node_modules/eslint/bin/eslint.js",
    "src/routes/_authenticated/admin.tsx",
    "src/test/ramen-catalogue.test.tsx",
  ],
  ["node_modules/vite/bin/vite.js", "build"],
];
let failures = 0;
for (const args of steps) {
  console.log(`\nCHECK ${args.join(" ")}`);
  const result = spawnSync(process.execPath, args, { stdio: "inherit", env: process.env });
  if (result.status !== 0) {
    failures++;
    console.error("Check failed:", args[0], result.error?.message || result.status);
  }
}
const lint = spawnSync(
  process.execPath,
  ["node_modules/eslint/bin/eslint.js", ".", "--format", "json"],
  { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
);
try {
  const files = JSON.parse(lint.stdout);
  const errors = files.reduce((sum, file) => sum + file.errorCount, 0);
  const warnings = files.reduce((sum, file) => sum + file.warningCount, 0);
  console.log(
    `Whole-project lint: ${errors} errors, ${warnings} warnings. Changed TypeScript files were checked separately above.`,
  );
  for (const file of files.filter((file) => file.errorCount))
    console.log(file.filePath, `${file.errorCount} errors`);
} catch {
  console.error("Could not summarize whole-project lint", lint.stderr);
  failures++;
}
process.exitCode = failures ? 1 : 0;
