## Goal
Stop the federation-lag verification failure from surfacing as a runtime/blank-screen error. Return a structured "retry" result from the server function and render a friendly inline warning + Try again button in the join form.

## Changes

### 1. `src/lib/join.functions.ts`
- Replace the `throw new Error("Couldn't verify yet — missing: …")` at line 85 with a normal return:
  ```ts
  return {
    ok: false as const,
    retry: true as const,
    missing: failures,
    message: `Couldn't verify yet — missing: ${failures.join(", ")}. Federation can lag a few seconds; try again shortly.`,
  };
  ```
- Wrap the success path in `{ ok: true as const, entry: row }` so the caller has a discriminated union.
- Leave the other `throw`s (event not found, closed, duplicate handle, DB insert error) alone — those are real errors, not transient lag.

### 2. `src/components/join-form.tsx`
- Add local state `retryNotice: { message: string; missing: string[] } | null`.
- In the mutation's `onSuccess`:
  - If `res.ok === true` → existing success toast + clear form + invalidate query, clear `retryNotice`.
  - If `res.ok === false` → set `retryNotice` from `res`, show a `toast.warning(res.message)` (no crash, no blank screen).
- Render the notice above the submit button when present: a small amber/muted panel with the message and a "Try again" button that re-runs `m.mutate({ handle, wallet })` with the same inputs. Keep the existing submit button working as well.
- Clear `retryNotice` whenever `handle` or `wallet` changes (stale).
- `onError` stays for genuine errors (duplicate handle, closed event, network).

## Out of scope
- No changes to `mastodon.server.ts` verification logic — federation lag is real, we're only changing how we communicate it.
- No changes to other server functions or the event page layout.