# ChainDraw — Solana Lab for DevLeague 2026 (Payments × CX tracks)

**1. Title / Hook**
- ChainDraw — "a web3 Gleam.io: verifiable multi-platform giveaways"
- Submitting for: Payments × CX tracks, Solana Lab for DevLeague 2026
- Live devnet: luckydraw.y09.space

**2. The Problem**
- Social giveaways run on trust, not proof
- Entrants can't verify the prize exists or the draw was fair
- Organizers can't prove honesty even when they're honest
- Gleam.io/Galxe processed ~1B+ entries — never solved this
- Black-box draws quietly erode brand trust

**3. The Solution**
- Prize committed on-chain *before* entries open
- Multi-platform action checklist, each action API-verified
- Auditable draw + public payout trail
- Same simplicity as Gleam.io for organizers — but trustless

**4. Payments Track — On-Chain Commitment & Escrow**
- Prize escrowed on-chain before a single entry — not a promise
- Anchor program (designed): Campaign PDA vault, Entry PDA per participant
- Permissionless draw + payout — anyone can trigger and verify
- No custodial backend wallet ever holds prize funds
- Public, replayable payout tx trail
- Payout is automatic, pushed straight to the winner's wallet — no "claim" step, no DM, nothing to phish
- Kills the #1 giveaway scam pattern: fake "you won!" messages asking for a seed phrase or "gas fee"
- Nothing to click, connect, or hand over — the win is a transaction signature, not an invitation to a scammer

**5. CX Track — Verified Multi-Platform Engagement**
- One place to run campaigns across fragmented socials (Mastodon, Farcaster, planned Bluesky/YouTube/Telegram)
- 3 verification models: public-data, entrant-OAuth, organizer-bot
- Real, API-checked engagement replaces vanity/bot-inflated metrics
- Funnel analytics (viewed → linked → verified → entered) as an organizer selling point

**6. Market — TAM / SAM / SOM**
- TAM: social media contest & giveaway tools market — $2.5B (2025) → $5.8B by 2034, 9.8% CAGR
- SAM: the slice running on API-checkable platforms — Telegram (~1B), Discord (~200M), Farcaster/Base App + fediverse
- SOM: crypto-native campaigners already running Gleam/Galxe who want an on-chain version, plus Solana/Superteam ecosystem projects
- Wedge: Malaysia/SEA web3 creator community as first go-to-market cohort

**7. Another Market Fit — Trust Without a Track Record**
- Famous brands/influencers get away with "trust us" — their reputation is the collateral
- A brand-new creator has none of that: no history, no reason for a stranger to believe the prize is real
- So new creators can't even use the giveaway playbook that works for established names
- Today's workaround — paying bot farms for fake followers/likes — exists *because* organic trust is unavailable at zero reputation
- ChainDraw replaces reputation with proof: on-chain escrow means the prize is verifiably real before anyone's heard of you
- A creator with zero followers can run a giveaway exactly as credible as a celebrity's
- The actual unlock: ChainDraw manufactures trust for people who have none yet

**8. Why Blockchain (not just a database)**
- Remove the chain → prize becomes a promise again, draw becomes a black box again
- PDA-based entries = duplicate-entry prevention enforced by the chain itself, not app logic
- On-chain commitment = provably funded before anyone risks entering

**9. Close / Contact**
- Payments track: trustless escrow + auto, phishing-proof payouts
- CX track: verified engagement + trust-on-demand for creators with zero track record
- Live: luckydraw.y09.space · Contact info
