// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// The whole Solana wallet stack (@solana/web3.js, @solana/wallet-adapter-*,
// rpc-websockets) only runs in the browser — gated behind <ClientOnly> and
// dynamic imports in event handlers. But Cloudflare's `workerd` resolver
// hard-fails on rpc-websockets (no `workerd` export condition) and a
// transitive dep does `util.inherits(X, undefined)` during worker module init
// when web3.js gets pulled in. We stub the entire chain in the SSR/worker
// env so the worker bundle stays clean. The client env keeps the real
// packages untouched.
const SSR_STUBBED_MODULES = new Set([
  "rpc-websockets",
  "@solana/web3.js",
  "@solana/wallet-adapter-react",
  "@solana/wallet-adapter-base",
  "@solana/wallet-adapter-phantom",
  "@solana/wallet-adapter-solflare",
]);
const STUB_VIRTUAL_ID = "\0virtual:solana-ssr-stub";
const solanaSsrShim = {
  name: "chaindraw:solana-ssr-shim",
  enforce: "pre" as const,
  resolveId(this: { environment?: { name?: string } }, id: string) {
    const envName = this.environment?.name;
    if (envName === "client") return null;
    // Match exact pkg or any subpath of stubbed pkgs.
    const base = id.startsWith("@")
      ? id.split("/").slice(0, 2).join("/")
      : id.split("/")[0];
    if (!SSR_STUBBED_MODULES.has(base)) return null;
    return { id: STUB_VIRTUAL_ID, moduleSideEffects: false };
  },
  load(id: string) {
    if (id !== STUB_VIRTUAL_ID) return null;
    // Proxy returns a no-op class/function for any property access, so
    // `import { Anything } from "<stubbed>"` resolves to a safe sentinel.
    return [
      "const noop = function () {};",
      "noop.prototype = {};",
      "const handler = { get: (_t, prop) => prop === '__esModule' ? true : noop };",
      "const stub = new Proxy(noop, handler);",
      "export default stub;",
      "export { stub as Client, stub as CommonClient, stub as WebSocket };",
      "export const __isSsrStub = true;",
      // Re-export the proxy itself as a star fallback for unknown named imports.
      "export const Connection = stub;",
      "export const PublicKey = stub;",
      "export const Transaction = stub;",
      "export const SystemProgram = stub;",
      "export const LAMPORTS_PER_SOL = 0;",
      "export const useWallet = () => ({ publicKey: null, connected: false, signTransaction: null });",
      "export const useConnection = () => ({ connection: null });",
      "export const ConnectionProvider = ({ children }) => children;",
      "export const WalletProvider = ({ children }) => children;",
      "export const PhantomWalletAdapter = noop;",
      "export const SolflareWalletAdapter = noop;",
    ].join("\n");
  },
};

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [solanaSsrShim],
  },
});
