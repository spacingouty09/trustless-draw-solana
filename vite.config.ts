// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    resolve: {
      alias: {
        // `rpc-websockets` (pulled in by @solana/web3.js → wallet adapters) only
        // exports `browser` / `node` conditions, so the Cloudflare `workerd`
        // resolver throws at build time. The wallet stack is gated behind
        // <ClientOnly>, so the SSR worker never actually runs this code —
        // we just need a resolvable module specifier for the bundler.
        "rpc-websockets": "rpc-websockets/dist/index.browser.mjs",
      },
    },
  },
});
