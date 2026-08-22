# ChainDraw — devnet verification

The Anchor program described in [architecture.md](architecture.md) is deployed and live on
Solana **devnet**, and a full campaign — create → join → draw → payout — has already been run
end-to-end. Everything below is independently checkable by anyone, using only public devnet RPC
calls. You don't need this repo, this machine, or any private key to verify it — only the
addresses and signatures listed here.

## Deployment

| | |
|---|---|
| Program ID | `mVfGuxEb9jWRWpf2n7wzRmEESqdvCWaBx9zQCALuJWz` |
| Cluster | devnet |
| Explorer | [program](https://explorer.solana.com/address/mVfGuxEb9jWRWpf2n7wzRmEESqdvCWaBx9zQCALuJWz?cluster=devnet) |
| Source | [`programs/chaindraw/src`](programs/chaindraw/src) |

## The demo campaign

Run via [`scripts/devnet-demo.mjs`](scripts/devnet-demo.mjs) — a standalone script using only
`@solana/web3.js`, no Anchor TS SDK. Re-run it yourself (`node scripts/devnet-demo.mjs`, after
funding a devnet wallet at `~/.config/solana/id.json`) to produce a fresh campaign with the exact
same logic.

| | |
|---|---|
| Campaign PDA | `3LbqRK5MgwSgQFjaHkQWHoi2N7HahSi1rLr6ZKTMmgFh` |
| Explorer | [campaign account](https://explorer.solana.com/address/3LbqRK5MgwSgQFjaHkQWHoi2N7HahSi1rLr6ZKTMmgFh?cluster=devnet) |
| Prize | 0.02 SOL, 2 winners, 3 entries (response-based ending trigger — closes on the 3rd join) |
| Authority (creator) | `FUf1fwMNDgY2ocXfpxysb5xg9MujVWy6cT5Lk999tKru` |
| Verifier | `4BbQ7s4XFQMkBYMJveLwSPskWWgz8EemyzCs1SnY4Z8a` |
| Cranker (permissionless caller for the draw + payouts) | `4n76BCZfnmHNUtrr6mvHpWYQrKeKLYBbYuAmbA5jrouX` |
| Participant 0 | `9i3FRgwzEJcgEvi8yuDDsn7zt2NXJmDc6n7xY2qFwWMh` — **won** |
| Participant 1 | `4bx5HnEFRNyEYazNcVXoH1fQNWVXj28GoMuGKhF1WQhi` — **won** |
| Participant 2 | `AeNHseyq12MZWk5SuWev86uWSvwwWGvp6xPVHrRtAEbo` |

### Every transaction, in order

1. `create_campaign` — [`5bvr8sLNjv6V8CNTqymqLTDDjeW8QWsV5vHZdAtTMUDRd19sDE5YQ52w3fWJ6C5DwoWWASz68ZykB6Gefe83zQEr`](https://explorer.solana.com/tx/5bvr8sLNjv6V8CNTqymqLTDDjeW8QWsV5vHZdAtTMUDRd19sDE5YQ52w3fWJ6C5DwoWWASz68ZykB6Gefe83zQEr?cluster=devnet)
2. `join_campaign` (participant 0) — [`4KpgozukA16idSe2F7bro9QzysDvAypcBrNvc9G9rFHFnaE9voEWs9Zyhg195MgQ5sZwfSq8pEf5RWA3uwzCGadK`](https://explorer.solana.com/tx/4KpgozukA16idSe2F7bro9QzysDvAypcBrNvc9G9rFHFnaE9voEWs9Zyhg195MgQ5sZwfSq8pEf5RWA3uwzCGadK?cluster=devnet)
3. `join_campaign` (participant 1) — [`2sAR5i8T6JKZXMUj2cT5b3hGLTeKnc2ePr7EhJcNE2Nmwti41C9zCYf3TJpcXH7ZY4fvZstNzffoBojGbzDCDKKN`](https://explorer.solana.com/tx/2sAR5i8T6JKZXMUj2cT5b3hGLTeKnc2ePr7EhJcNE2Nmwti41C9zCYf3TJpcXH7ZY4fvZstNzffoBojGbzDCDKKN?cluster=devnet)
4. `join_campaign` (participant 2, fills the campaign — no more entries possible after this) — [`3GQT94FomL3DE9WEh4XKiBbQyUW4d4xYTxd4mBsvLskXqWvfo9XeMrdMKcFkrm3eHK5pS9mbAGwCXueD7B9hvjX7`](https://explorer.solana.com/tx/3GQT94FomL3DE9WEh4XKiBbQyUW4d4xYTxd4mBsvLskXqWvfo9XeMrdMKcFkrm3eHK5pS9mbAGwCXueD7B9hvjX7?cluster=devnet)
5. `request_draw` (commits to future slot `486625189`) — [`4r2cWU42Hu23QxySFopa3o1iHPjdEEh6G7NBN6iYn5SVQriU7bVdchMofS3PWRJUYhWEdSGikHWka2nbGimnkEe6`](https://explorer.solana.com/tx/4r2cWU42Hu23QxySFopa3o1iHPjdEEh6G7NBN6iYn5SVQriU7bVdchMofS3PWRJUYhWEdSGikHWka2nbGimnkEe6?cluster=devnet)
6. `resolve_draw` (reads slot `486625189`'s hash, computes winners) — [`5J6XvwBm5YTRfQH4Qg2NQaCQWGTYzAMpbyA4aYLCGmKFFrzzoYbV3VLPC5RkJMWqKFyiL7toXpgh3ov8zsAp7Qdi`](https://explorer.solana.com/tx/5J6XvwBm5YTRfQH4Qg2NQaCQWGTYzAMpbyA4aYLCGmKFFrzzoYbV3VLPC5RkJMWqKFyiL7toXpgh3ov8zsAp7Qdi?cluster=devnet)
7. `claim_prize` (participant 0, +0.01 SOL) — [`5sQL62ygu2yFxcqAbfxJPAhQzSePvgRqDWeF34JRm55ovJ1iUMhCqbZDVzuoroYtJdmHPtnrq8Q2pGuauTBuUUTe`](https://explorer.solana.com/tx/5sQL62ygu2yFxcqAbfxJPAhQzSePvgRqDWeF34JRm55ovJ1iUMhCqbZDVzuoroYtJdmHPtnrq8Q2pGuauTBuUUTe?cluster=devnet)
8. `claim_prize` (participant 1, +0.01 SOL) — [`ADYZwsa86TxjqU1ptpRjwPynfaorc9aouQuCaY4P9FJHtRD1dqBGF8E5qS7i4CXuBT6omPQEMrkE3YVhX1QZ9Xt`](https://explorer.solana.com/tx/ADYZwsa86TxjqU1ptpRjwPynfaorc9aouQuCaY4P9FJHtRD1dqBGF8E5qS7i4CXuBT6omPQEMrkE3YVhX1QZ9Xt?cluster=devnet)

Participant 2 did not win and was never paid — nobody claimed on their behalf, and the program has
no path for anyone but a winning entry's own participant address to receive funds.

## How winners actually get paid

`claim_prize` is a separate instruction from the draw itself, and it's worth understanding why:
`resolve_draw` only decides *who* won (writes `Campaign.winner_indices`) — it doesn't move any
money. Payout is a distinct, per-winner step, on purpose:

- **Permissionless, per winner.** Anyone can call `claim_prize` on behalf of a specific winning
  `Entry` — the winner doesn't have to click anything or even be online. In transactions #7 and #8
  above, the same `cranker` keypair that requested and resolved the draw also triggered both
  payouts; the winning *participants themselves never signed or paid a single transaction* in this
  campaign. Funds only ever land on `entry.participant` — the `claim_prize` caller can be anyone,
  but the destination is fixed by the on-chain `Entry` record, not by whoever happens to call it.
- **Exact split, no rounding surprises.** Each payout is `prize_amount / num_winners` in integer
  lamports — here, `20_000_000 / 2 = 10_000_000` lamports (0.01 SOL) per winner, matching the
  `+0.01 SOL` observed on both participant balances. Any remainder from an uneven split (e.g. an
  odd `prize_amount`) simply stays in the campaign vault rather than being distributed unevenly.
- **Can't be double-paid.** Each `Entry` account has a `claimed` flag the program sets on first
  successful payout; a second `claim_prize` call on the same entry is rejected outright
  (`AlreadyClaimed`) rather than silently doing nothing or double-spending the vault — this is
  enforced by the program, not by whoever happens to be running the cranker.
- **Can't be paid to the wrong wallet.** The instruction's `participant` account is constrained to
  equal `entry.participant` — there's no way to redirect a winner's payout to a different address,
  regardless of who submits the `claim_prize` transaction or what account list they attempt to pass.

In other words: once a draw resolves, payout is a mechanical, permissionless cleanup step that
requires no trust in the campaign organizer, the cranker, or ChainDraw's own backend — anyone
can settle every winner's payout by simply calling `claim_prize` once per winning entry.

## Recompute the draw yourself — the actual trust claim

The draw isn't "trust us, the backend picked fairly" — it's independently recomputable by anyone
from two pieces of public on-chain data:

1. The campaign account's `randomness_target_slot` field (committed by `request_draw`, **before**
   that slot existed — so nobody, including the campaign's own creator, could have known its hash
   in advance).
2. That slot's hash, from the `SlotHashes` sysvar (`SysvarS1otHashes111111111111111111111111111`)
   — a real, retrievable-forever piece of Solana chain history, not something any program controls.

```
target_slot = 486625189
slot_hash   = 3865ac9678d76921ac16b36f9b38450c31ae01057072023d44c4e3e212e47df1

for i in 0, 1 (num_winners = 2):
  candidate = sha256(slot_hash || i as u32 LE)[0..4] as u32 LE, mod 3 (entry_count)
  skip if already picked

=> winner_indices = [0, 1]
```

This matches `resolve_draw`'s actual on-chain result exactly (transaction #6 above) — you can read
`Campaign.winner_indices` yourself from the campaign account and see `[0, 1, ...]`, or just re-run
the recompute:

```bash
node -e '
import("@solana/web3.js").then(async ({Connection, PublicKey}) => {
  const conn = new Connection("https://api.devnet.solana.com", "confirmed");
  const campaign = new PublicKey("3LbqRK5MgwSgQFjaHkQWHoi2N7HahSi1rLr6ZKTMmgFh");
  const data = (await conn.getAccountInfo(campaign)).data;
  console.log("randomness_target_slot:", data.readBigUInt64LE(107).toString());
  console.log("winner_indices (first 2):", data.readUInt32LE(115+0), data.readUInt32LE(115+4));
});
'
```

(Byte offsets assume this campaign's response-based `EndingTrigger` — see
`decodeCampaign()` in `scripts/devnet-demo.mjs` for the general, correctly-cursor-based parser.)

## Honest trust-tier note

This is **not** VRF. `architecture.md`'s original design called for a VRF provider (ORAO), because
plain recent-slot-hash randomness is influenceable by whichever validator produces that slot.
ORAO's Rust SDK turned out to be incompatible with this project's Anchor version (see the plan
file / commit history for the full account of that attempt) as of 2026-08-22, so this milestone
ships with a **delayed SlotHashes commit-reveal** instead: `request_draw` commits to a slot roughly
20 seconds in the future, before that slot's outcome exists anywhere. This is meaningfully stronger
than "recent slot hash" (nobody can act on foreknowledge of an outcome that doesn't exist yet) but
weaker than real VRF (a validator producing that specific future slot has some influence over its
hash). Revisiting with real VRF — either once ORAO ships an Anchor-1.x-compatible release, or via a
carefully-verified raw-bytes integration — is tracked as follow-up work, not glossed over here.

## What this milestone does *not* yet cover

- NFT lottery tickets (Metaplex Core) — entries are the on-chain `Entry` PDA only, no NFT minted yet.
- SPL-token prizes — this program is SOL-only for v1.
- The live app (luckydraw.y09.space) isn't wired to this program yet — it still runs the older
  Memo-transaction commitment flow described in `architecture.md`'s "Key flows" section. That
  integration is the next milestone (M2).
