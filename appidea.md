# ChainDraw — App Idea

> **A web3 Gleam.io: verifiable multi-platform engagement campaigns.** Think [Gleam.io](https://gleam.io) — "complete these actions across social platforms to enter" — but with the web2 trust problem solved by web3 rails: prizes committed on-chain before entries open, every action verified against platform APIs, an auditable draw, and a public payout trail.

**Live:** https://luckydraw.y09.space · **Status:** Devnet MVP (Mastodon + Farcaster live). On-chain program (NFT tickets, PDA campaign/entry accounts, VRF draw) designed at the Superteam MY "AI x Blockchain Builder Bootcamp" workshop assessment (2026-08-22) — **not yet built**, see [architecture.md](architecture.md#planned-on-chain-program-anchor--designed-not-yet-built).

## Validation signal

Beyond desk research (3 internal `/validate-idea` sprints, final verdict **GO**, 0.7 confidence — see `.superstack/idea-context.md`), talked directly to creators currently running campaigns on **Gleam.io and Galxe**: they expressed real interest in a verifiable, on-chain version. That's the load-bearing assumption the whole product bets on — **no zero-trust campaign platform utilizing blockchain currently exists** — with non-bot creator follower growth as a secondary, bonus benefit rather than the core claim.

## The thesis: bridge web2 and web3

The product binds the gap between web2 and web3 in both directions:

- **For web2 campaigners:** social giveaways are a low-trust channel — entrants can't verify the prize exists, the draw was fair, or the winner was real; organizers can't prove honesty even when honest. Web3 rails (on-chain commitment, auditable draws, public payouts) fix exactly this, without the campaigner needing to understand crypto.
- **For web3 users → web2 platforms:** campaigns direct an engaged, incentive-responsive web3 audience at *traditional* social accounts — real follows, likes, reposts, and comments on the platforms where the campaigner actually needs growth.

Gleam.io proved the multi-platform action-checklist model (~1B+ entries processed). It never solved trust: winners are picked in a black box and prizes are a promise. That's the gap ChainDraw fills.

## The product model (Gleam-style, web3-settled)

- **Campaign** — prize (token + total), number of winners, an ending trigger (time-based cutoff, or response-based: closes once a target entry count is reached), and an **on-chain prize commitment** made before entries open.
- **Action checklist** — each campaign lists required (and later, bonus) actions **across multiple platforms**: "❤️ this Farcaster cast", "🔁 boost this Mastodon post", "follow us on Bluesky", "subscribe on YouTube", "repost on Weibo". Action types: like/favourite, share/repost, follow/subscribe/join, comment-with-code, post/tag.
- **Participant** — links one identity per platform they need (sign-in per platform) plus one Solana payout wallet; each action is verified independently against the platform's API and recorded. All required actions verified → entered.
- **Lottery ticket = NFT** *(designed, not yet built — see architecture.md)* — once verified, an NFT is minted to the participant's wallet as their entry, gaslessly: the participant only signs consent (proves they control the payout address), the campaign's backend/authority pays the mint fee. The ticket is independently auditable on any explorer — the whole point of putting entries on-chain instead of only in a database.
- **Draw & payout** — seeded, auditable winner selection today; a permissionless, VRF-backed on-chain draw is the designed next step (see architecture.md) so anyone can trigger and independently verify the draw, not just re-run the published seed. Payouts pushed to winners' wallets with tx signatures displayed publicly.

## Three verification models (the architecture backbone)

| Model | How engagement is proven | Platforms |
|---|---|---|
| **A. Public-data** | Engagement lists are publicly queryable | Bluesky, Mastodon/fediverse, Farcaster |
| **B. Entrant-OAuth** | Entrant signs in and grants read access to their own activity | YouTube, Reddit, Weibo, X (paid) |
| **C. Organizer-bot** | Organizer connects a bot/business account that sees engagement in their own space | Telegram, Discord, Instagram (own posts) |

Plus a universal **reply-code fallback**: the entrant posts a unique short code as a comment/reply on the campaign post — verifiable on almost every platform (YouTube, Instagram, Threads, X free tier) even where like-data is locked.

## Platform tiers

Gate: can the API prove a specific user performed a specific action? Then ranked by **user base**, API cost, and crypto culture.

| Tier | Platform | ~User base | Verifiable actions | API cost | Crypto culture | Why here |
|---|---|---|---|---|---|---|
| ✅ done | Farcaster (+Base App) | ~few M (small) | like, recast, follow + **verified Solana wallet on profile** | Free start (Neynar) | ✅✅ | Small but crypto-dense = the seed audience; validated GO; shipped and verified live (SIWF + Neynar) |
| **1** | Bluesky | ~35M+ | like, repost, follow — all public, no auth | **$0** | ⚠️ | Cheapest meaningful reach; purest web2-bridge story |
| ✅ done | Mastodon | ~1M | favourite, boost, follow | $0 | ❌ | Shipped; keep |
| **2** | YouTube | 2.5B | subscribe (OAuth), comment-code | Free quota | ⚠️ | Biggest reach of all verifiable platforms |
| **2** | Telegram | ~1B | join, reactions (bot) | $0 | ✅✅ | Massive + crypto-native |
| **2** | Weibo (intl) | ~590M | follow, repost, comment (likes not exposed) | Approval-gated, free-ish | 🚫 on-platform / ✅ off-platform | Campaign posts stay crypto-free; web3 users grow the campaigner's account; crypto mechanics live entirely on ChainDraw. Residual gray zone: prizes are still crypto — organizer's disclosure choice; revisit before scaling |
| **2** | Reddit | ~500M | upvote (OAuth self-history), comment, join | Free tier | ⚠️ | Entrant-OAuth model |
| **3** | Discord | ~200M | join, react (bot) | $0 | ✅✅ | Community-shaped campaigns |
| **3** | X/Twitter | ~600M | like/repost/follow — paywalled (~$200+/mo) | 💰 | ✅✅ | Promote the moment organizer revenue covers API cost |
| **4** | Instagram/Threads | 2B+ | comment-code, tag only (business, own posts) | $0 | ❌ | Huge base, weakest verification — reply-code only |
| ❌ skip | XHS/RedNote | ~300M | None — no official API; scraping breaks ToS and the trustless brand | — | 🚫 | Revisit if the official open platform adds content APIs |
| ❌ skip | TikTok, LinkedIn | — | None at any price | — | — | Revisit if APIs change |

## Why this beats the incumbents

| | Gleam.io / SweepWidget | Raffle dApps (GiveFi, raffl…) | ChainDraw |
|---|---|---|---|
| Multi-platform actions | ✅ | ❌ (single-chain raffles) | ✅ |
| Verified engagement (API-checked) | ⚠️ partial, trust-us | ❌ n/a | ✅ |
| Prize committed before entry | ❌ | ⚠️ paid-ticket escrow | ✅ on-chain |
| Auditable draw | ❌ black box | ✅ | ✅ (seed published; VRF planned) |
| Public payout trail | ❌ | ✅ | ✅ |
| Fediverse / Bluesky / Weibo coverage | ❌ | ❌ | ✅ |

## Current scope (devnet MVP)

- Mastodon single-platform flow live end-to-end (OAuth sign-in, favourite/boost/follow verification, seeded draw, payout recording).
- Prize commitment and payouts are Memo-program transactions on Solana devnet — public markers, not yet escrowed funds.
- Draw randomness is a server-generated published seed, not yet VRF.

## Build plan (near-term)

1. ✅ **Schema:** `campaign_actions` + `action_completions` + linked participant identities — the multi-platform seam everything else plugs into. Shipped.
2. ✅ **Farcaster adapter** (validated GO): Sign In With Farcaster + Neynar verification; auto-fill payout wallet from the profile's verified Solana address; reaches Base App for free. Shipped, verified live end-to-end.
3. **Next: on-chain program** *(designed, not built)* — NFT lottery tickets, PDA-based campaign/entry accounts, permissionless VRF draw. Full spec in [architecture.md](architecture.md#planned-on-chain-program-anchor--designed-not-yet-built). First milestone: a replayable devnet campaign anyone can independently audit.
4. **Bluesky adapter**: fully public AT Protocol data, $0.
5. **Reply-code engine**: unlocks YouTube/Instagram/Threads/X-free cheaply.
6. Telegram/Discord bots → Reddit/YouTube OAuth → X paid tier as revenue justifies.

## Roadmap ideas

- **Self-hosted ActivityPub module:** make ChainDraw a small AP server (module in this codebase, e.g. via [Fedify](https://fedify.dev)) that hosts campaign posts itself — every favourite/boost/follow from any federating network (Mastodon, Misskey, Pleroma, partially Threads, bridged Bluesky) arrives in one inbox as signed activities. One inbox replaces N fediverse APIs; the polling adapter stays as fallback for externally-hosted posts.
- **On-chain escrow + NFT tickets + permissionless VRF draw** *(designed 2026-08-22, not yet built)* — an Anchor program with PDA-based campaign and entry accounts replacing the current Memo-commit + Postgres model. Full spec, including the honest trust-boundary limitation (entry admission still trusts a backend verifier key; only the draw and payout are meant to be fully permissionless) in [architecture.md](architecture.md#planned-on-chain-program-anchor--designed-not-yet-built).
- **SPL payouts & prize tiers:** real USDC/SPL transfers; unequal 1st/2nd/3rd splits; Gleam-style bonus-entry points.
- **Organizer analytics:** funnel per action (viewed → linked → verified → entered) — itself a selling point vs "trust us" tools.
- **Mainnet launch** once the on-chain program lands and passes the devnet replayability bar described in architecture.md.
