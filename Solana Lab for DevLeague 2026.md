# Fairseed (formerly ChainDraw) — Solana Lab for DevLeague 2026 (Payments × CX tracks)

**1. Title / Hook**
- Fairseed — "a web3 Gleam.io: verifiable multi-platform giveaways"
- Submitting for: Payments × CX tracks, Solana Lab for DevLeague 2026
- Anchor program live on Solana devnet — full campaign already run end-to-end, every transaction public

**2. The Problem**
- Social giveaways run on trust, not proof
- Entrants can't verify the prize exists or the draw was fair
- Organizers can't prove honesty even when they're honest
- Gleam.io/Galxe processed ~1B+ entries — never solved this
- Black-box draws quietly erode brand trust

**3. The Solution**
- Prize escrowed on-chain *before* entries open — in a wallet nobody holds a key to
- Multi-platform action checklist, each action API-verified
- Draw anyone can recompute; payout anyone can trigger
- Same simplicity as Gleam.io for organizers — but trustless

**4. Payments Track — Escrow & Automatic Payout**
- Prize sits in a program-controlled Campaign PDA — no private key exists for it, not even the organizer's
- Address is public from creation, so anyone can confirm the prize is genuinely funded before entering
- Payout is permissionless and per-winner: anyone can trigger it on a winner's behalf
- **Winners never sign or pay for anything** — in the devnet run, both winners received their prize without submitting a single transaction
- Funds can only land on the winner's own wallet — destination is fixed by the on-chain entry record, not by whoever calls
- Can't be double-paid: an on-chain `claimed` flag rejects a second attempt outright
- Kills the #1 giveaway scam: no claim link, no DM, nothing for a phisher to insert themselves into

**5. CX Track — Verified Multi-Platform Engagement**
- One place to run campaigns across fragmented socials (Mastodon, Farcaster live; Bluesky/YouTube/Telegram planned)
- 3 verification models: public-data, entrant-OAuth, organizer-bot
- Every counted action is checked against the platform's own API — no screenshots or self-reported entries
- Organizer picks the ending trigger: a time cutoff, or a target entry count that closes the campaign the moment it's hit
- Closing is enforced by the program — not a moment the organizer gets to choose

**6. Proven on Devnet — Not a Slide Deck Promise**
- Program deployed to devnet: `mVfGuxEb9jWRWpf2n7wzRmEESqdvCWaBx9zQCALuJWz`
- A complete campaign already run: create → 3 entries → draw → 2 payouts, all 8 transactions public
- The draw commits to a *future* Solana slot before that slot's outcome exists anywhere — nobody, including the creator, can know it in advance
- Anyone can recompute the winners from two public on-chain values and check they match
- Honest status: this is delayed commit-reveal, not yet VRF; the web app still runs the older flow — program integration is the next milestone

**7. Market — TAM / SAM / SOM**
- TAM: social media contest & giveaway tools market — $2.5B (2025) → $5.8B by 2034, 9.8% CAGR
- SAM: the slice running on API-checkable platforms — Telegram (~1B), Discord (~200M), Farcaster/Base App + fediverse
- SOM: crypto-native campaigners already running Gleam/Galxe who want an on-chain version, plus Solana/Superteam ecosystem projects
- Wedge: Malaysia/SEA web3 creator community as first go-to-market cohort

**8. Versus the Incumbents**

| | Gleam.io | Galxe | Fairseed |
|---|---|---|---|
| Prize locked before entries | ❌ No | ❌ No | ✅ Yes |
| Draw recomputable by anyone | ❌ Black box | ❌ Platform algorithm | ✅ Yes |
| Winner must claim | ⚠️ Chased by organizer | ❌ 14 days or forfeit | ✅ Never — auto-paid |
| Works at zero reputation | ❌ No | ❌ No | ✅ Yes |
| Platform reach | ✅ Broad | ✅ Large | ⚠️ Early |

> Behind both on reach. Ahead of both on everything trust depends on.

**9. Trust Without a Track Record**
- Famous brands/influencers get away with "trust us" — their reputation is the collateral
- A brand-new creator has none of that: no history, no reason for a stranger to believe the prize is real
- So new creators can't even use the giveaway playbook that works for established names
- That's the 0 → 1 problem: algorithms don't surface accounts nobody engages with yet, so the first momentum — roughly the first 50k followers — is the hardest to get
- Today's workaround — paying bot farms for fake followers/likes — exists *because* organic trust is unavailable at zero reputation
- Fairseed replaces reputation with proof: the escrowed prize is verifiably real before anyone's heard of you
- A creator with zero followers can run a giveaway exactly as credible as a celebrity's

**10. Why Blockchain (not just a database)**
- Remove the chain → the prize is a promise again, the draw is a black box again, the payout is a phishing surface again
- Duplicate entries are blocked by the runtime itself — a second entry from the same wallet can't be created, no app logic involved
- Escrow means the organizer *cannot* walk away with the prize after entries open, rather than merely promising not to
- Sub-cent fees make this viable for prize pools far too small to justify traditional escrow

**11. Close / Contact**
- Payments track: real escrow + automatic, phishing-proof payouts, proven on devnet
- CX track: verified engagement + trust-on-demand for creators with zero track record
- Program, campaign, and every transaction: public and independently checkable
