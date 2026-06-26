## Why it loads in the Lovable preview but fails in a new tab

The crash is the same on both: a Solana chunk runs `Buffer.from(...)` at module init and throws `Cannot read properties of undefined (reading 'from')` because `window.Buffer` isn't defined yet. The reason you only notice it when opening the URL directly:

- **Inside the Lovable editor**, the preview iframe is wrapped by Lovable's host page. The host injects helper scripts and an error overlay, and (most importantly) it warms the page with extra runtime shims and polls before your app's lazy chunks evaluate. The wallet chunk often ends up running after `Buffer` has been set by one of those shims, or the error is swallowed by the editor overlay and the page is re-mounted, so you never see a hard failure.
- **Opening the URL in a new tab** (preview or published) loads the app cold with no host wrapper. The Solana wallet chunk is the first thing that touches `Buffer`, so the missing global throws immediately and TanStack's root error boundary shows "This page didn't load".

We already have `src/lib/buffer-polyfill.ts` and import it at the top of the wallet files, but those files are inside a `React.lazy(() => import("@/components/wallet-provider"))` chunk. Rolldown can hoist sibling Solana modules into the same chunk and evaluate them before the polyfill's side effect runs — that's the race that bites only in the cold-load case.

## Fix

Move the polyfill so it runs in the **main client entry**, before any lazy chunk is ever requested.

1. Add `import "./lib/buffer-polyfill";` as the very first line of `src/router.tsx` (already in main bundle, runs before route components mount).
2. Also add it as the first line of `src/start.ts` so it's part of the bootstrap module graph regardless of which entry Vite ships.
3. Keep the existing imports inside the wallet files as a belt-and-braces guard.

No other behavior changes. After this, the new-tab load will set `window.Buffer` / `process` / `global` synchronously during the initial bundle eval, so the Solana chunk finds them when it later initializes.

## Verification

- Hard-reload `https://trustless-draw-solana.lovable.app/` in a private window — landing page renders, no root error boundary, no `Cannot read properties of undefined (reading 'from')` in the console.
- Same check on the preview URL opened in a new tab.
- Connect wallet still works (polyfill is unchanged, only its load timing moved earlier).
