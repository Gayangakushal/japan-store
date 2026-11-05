// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv } from "node:util";

// The editor can inherit credentials for the original Lovable backend. An
// explicitly configured local Supabase project must take precedence over those.
const localEnv = Object.assign(
  {},
  ...[".env", ".env.local"].map((file) => {
    const path = resolve(process.cwd(), file);
    return existsSync(path) ? parseEnv(readFileSync(path, "utf8")) : {};
  }),
);
const databaseDefines = Object.fromEntries(
  ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_PROJECT_ID"]
    .filter((key) => localEnv[key])
    .map((key) => [`import.meta.env.${key}`, JSON.stringify(localEnv[key])]),
);

export default defineConfig({
  vite: { define: databaseDefines },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
