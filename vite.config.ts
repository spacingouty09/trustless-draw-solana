// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// `rpc-websockets` (pulled in by @solana/web3.js → wallet adapters) only
// declares `browser` / `node` export conditions, so Cloudflare's `workerd`
// resolver hard-fails at build time. The wallet stack is gated behind
// <ClientOnly> so the SSR worker never executes this code; we just need a
// resolvable module for the bundler in the SSR/worker env. The client env
// keeps the real `rpc-websockets` (browser build) untouched.
const rpcWebsocketsSsrShim = {
  name: "chaindraw:rpc-websockets-ssr-shim",
  enforce: "pre" as const,
  resolveId(this: { environment?: { name?: string } }, id: string) {
    if (id !== "rpc-websockets") return null;
    const envName = this.environment?.name;
    if (envName === "client") return null;
    return { id: "\0virtual:rpc-websockets-stub", moduleSideEffects: false };
  },
  load(id: string) {
    if (id !== "\0virtual:rpc-websockets-stub") return null;
    return "export class Client {}\nexport class CommonClient {}\nexport default {};\n";
  },
};

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [rpcWebsocketsSsrShim],
  },
});
