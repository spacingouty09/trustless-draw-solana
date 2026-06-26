## Diagnosis

The published worker logs show the real cause on every request (even `/favicon.ico`):

```
TypeError [ERR_INVALID_ARG_TYPE]: The "superCtor.prototype" property must be of type object. Received undefined
```

That's `util.inherits(X, undefined)` running at **worker module init**. The big client-side stack you pasted is downstream: SSR returns the "This page didn't load" HTML (from `src/server.ts`), the client tries to hydrate it, and React's reconciler blows up.

The existing `solanaSsrShim` in `vite.config.ts` was meant to keep Solana/`rpc-websockets` out of the worker bundle, but something in the worker SSR graph is still reaching code that calls `util.inherits` with `undefined`. Likely culprits not currently covered:

- `@solana/wallet-standard-*`, `@wallet-standard/*`, `@solana/wallet-adapter-wallets`, `@solana-mobile/*`, etc. (pulled by `@solana/wallet-adapter-react`).
- A subpath import (e.g. `@solana/web3.js/lib/...`) where our `base = @solana/web3.js` matcher actually does still hit, but the resolver returns a virtual id whose `\0`-prefix gets stripped by another plugin.
- The shim's `envName === "client"` guard: in the cloudflare/nitro build the SSR environment may not be named `"ssr"`. If `this.environment` is `undefined` during early resolution it still stubs (correct), but we should explicitly confirm and stub on `ssr` flag too.

## Plan

### 1. `vite.config.ts` — harden the SSR shim
- Switch the gate from "stub unless client" to "stub when not client AND not a browser build". Use the second `resolveId` argument (`{ ssr }`) where available in addition to `this.environment?.name`.
- Expand `SSR_STUBBED_MODULES` to include:
  - `@solana/wallet-standard-features`
  - `@solana/wallet-standard-wallet-adapter-base`
  - `@solana/wallet-standard-wallet-adapter-react`
  - `@wallet-standard/base`, `@wallet-standard/app`, `@wallet-standard/wallet`, `@wallet-standard/features`, `@wallet-standard/core`
  - `@solana-mobile/wallet-adapter-mobile`
  - `eventemitter3` is NOT stubbed (legitimate dep elsewhere); leave alone.
- Treat any id starting with `@solana/` or `@wallet-standard/` as stubbed via a prefix match, so we don't have to enumerate every transitive.
- Keep the virtual id and Proxy stub as-is, but also add `export const Keypair = stub; export const VersionedTransaction = stub; export const TransactionInstruction = stub;` so any `import { ... } from "@solana/web3.js"` that happens to be statically reachable resolves cleanly.

### 2. `src/server.ts` — surface the captured error in the HTML
Right now `renderErrorPage()` is dependency-free and shows a generic message, which made this loop hard to diagnose. Add a hidden `<!-- ssr-error: ... -->` comment at the bottom of the response (only in non-prod or when an `x-debug` query param is present) containing `consumeLastCapturedError()`'s `.message` + first stack line. No code-change to `renderErrorPage` API; just append before sending.

### 3. Verify the `SOLANA_RPC` secret is set in production
`src/routes/api/public/solana-rpc.ts` returns a 500 JSON if `process.env.SOLANA_RPC` is missing. That alone wouldn't cause the `util.inherits` crash, but we should confirm the secret was actually persisted in Cloudflare env (Lovable Cloud injects it on publish). If missing, set it.

### 4. Re-publish and re-check worker logs
After the shim change, the `util.inherits` error should disappear from worker logs and the published root URL should return real HTML. If a different module-init error appears, repeat with the captured `error.stack` to identify the next leaky import.

## Out of scope

- No changes to wallet/Solana client code — these only run in the browser and are working there.
- No changes to route/component structure.
