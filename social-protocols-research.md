# Wallet-Native Social Protocols — Research (2026-08)

Research for Fairseed's multi-platform expansion: which crypto-social protocols exist, how their identity/wallet layers work, and what integrating each would take. Companion to the ActivityPub module planned in `appidea.md`.

## The landscape in one paragraph

There are really three families. **(1) Wallet-native social protocols** — Farcaster (plus Base App riding on it), Lens, Tapestry — where a social identity is bound to a crypto wallet, which is exactly what a giveaway app wants (verify engagement AND know where to pay the winner, no separate wallet-collection step). **(2) Key-pair/decentralized protocols without a money-native identity** — Nostr (Bitcoin-adjacent via Lightning zaps), ActivityPub/fediverse, AT Protocol/Bluesky — open but payouts need a separately collected address. **(3) Centralized platforms with crypto branding** — Binance Square — which are not protocols at all; you get whatever API the company grants.

## Comparison table

| | **Farcaster** | **Base App** (Coinbase) | **Lens** | **Tapestry** | **Nostr** | **Binance Square** | *(ref: ActivityPub)* |
|---|---|---|---|---|---|---|---|
| **What it is** | Decentralized social protocol; identity on-chain, content on Snapchain (blockchain-like p2p data layer, ~10k TPS) | Coinbase Wallet rebranded into a social super-app; feed is **Farcaster protocol** under the hood; posts tokenized via Zora; mini-apps | SocialFi protocol with its own L2 (**Lens Chain**: ZKsync stack + Avail DA); primitives: accounts, graphs, feeds, groups, rules | Solana-native social graph protocol using **state compression on L1**; 100k+ on-chain profiles; REST API | Minimal open protocol: identity = key pair, content on independent relays; tips via Lightning "zaps" | Centralized content feed inside Binance CEX; not a protocol | W3C standard; identity = actor on any federating server |
| **Chain / layer** | Identity contracts on OP Mainnet; data on Snapchain (off-chain, deterministic) | Base (Ethereum L2); social data = Farcaster | Lens Chain (own ZKsync-based L2) | Solana L1 (compressed accounts) | No chain; Bitcoin Lightning for payments | None (Binance database) | None |
| **Wallet identity** | ✅ Strong — FID owned by an Ethereum address; users attach **verified ETH & Solana addresses** to their profile | ✅ Strongest mainstream reach — every user *is* a Coinbase Wallet user by definition | ✅ Account = smart contract wallet; USD gas, account abstraction | ✅ Profile keyed to a **Solana wallet** | ⚠️ Key pair, not a wallet; Lightning address optional | ⚠️ Binance account (custodial), no public wallet linkage | ❌ None |
| **App auth** | Sign In With Farcaster (FIP-11, SIWE-based, QR/relay flow) | Same (SIWF) + mini-app context inside the client | Lens SDK auth (wallet signature) | Wallet signature (Solana) | NIP-07/key signature | ❌ No third-party user auth | Per-server OAuth (or none for public data) |
| **Read engagement (likes/recasts/follows)** | ✅ Open: Neynar API (canonical), or run/read a Snapchain node directly — no permission needed | ✅ Same data — one Farcaster integration covers Warpcast + Base App audiences | ✅ Lens API/indexer | ✅ REST API; graph data on-chain | ⚠️ Query relays; coverage depends on relay set | ❌ Post-only API for creators (AI-agent publishing); no public read/engagement API | ✅ Pushed to your inbox if you host the post |
| **Status (2026)** | Protocol acquired by **Neynar (Jan 2026)**, which runs Snapchain validators + canonical API; spec stays MIT/open. Warpcast continues under Neynar | Global launch **Dec 2025**, 140+ countries; the mainstream on-ramp for Farcaster content | Stewardship moved from Avara/Aave to **Mask Network (Jan 2026)** — pivot from protocol experimentation to consumer apps; some ecosystem uncertainty | Series A ($5.75M, USV/Fabric, 2025); active 2026 (Solana Graveyard Hackathon social track); expanding to Aptos/Monad/Berachain | Alive but **user growth flat/declining** late 2025 despite better apps; zaps very active (20M+ in a 2-week window, 2025) | Active as a CEX feature; closed | Threads partially federates; Bluesky bridgeable (Bridgy Fed) |
| **Giveaway culture fit** | ✅ Crypto-native; airdrops/quests/tipping are normal behavior | ✅✅ Mainstream retail crypto users; creators already monetize posts | ⚠️ Smaller active user base; SocialFi-native | ⚠️ Infra layer, not a consumer network — fit depends on which Tapestry apps have users | ⚠️ Bitcoin-maxi culture; altcoin (Solana) prizes likely unwelcome | ✅ Audience loves giveaways, but platform controls everything | ❌ Anti-promotion, largely anti-crypto |
| **Fairseed integration cost** | **Low** — Neynar REST API for engagement + SIWF for login; payout address already on profile (incl. Solana!) | **~Zero extra** once Farcaster adapter exists | Medium — new SDK, new chain, EVM payouts | **Low** — REST API, same chain as Fairseed; but small end-user reach | Medium — relay querying; payouts would be Lightning, not Solana | Not viable (no read API) | Planned self-hosted module (Fedify) |

## Key takeaways for Fairseed

1. **Farcaster is the highest-leverage single integration.** One adapter (Neynar API + Sign In With Farcaster) covers both Warpcast *and* Coinbase's Base App audience — the largest mainstream wallet-native social reach available. Decisive detail: Farcaster profiles carry **verified Solana addresses**, so the "enter your wallet" step disappears — verify the cast engagement, pay the verified address. That's a materially better UX than the Mastodon flow.
2. **Base App is not a separate protocol** — don't build a "Base integration"; build the Farcaster adapter and you're in Base App feeds for free. (Its Zora post-tokenization layer is irrelevant to giveaways.)
3. **Tapestry is the dark horse** — Solana-native, same chain as your payouts, trivial REST integration — but it's infrastructure without a flagship consumer network yet. Watch it; integrate if a Tapestry-powered app with real users emerges.
4. **Lens is in transition** (Mask Network takeover, Jan 2026) — wait for the dust to settle before investing.
5. **Nostr and Binance Square are poor fits** for opposite reasons: Nostr's culture is Bitcoin-only (Solana prizes would land badly) and its payments rail is Lightning; Binance Square has the giveaway-hungry audience but no protocol — no read API, no verifiable engagement, no wallet linkage.
6. **Protocol risk is real everywhere**: Farcaster's canonical infra is now one company (Neynar) post-acquisition; Lens changed stewards; Tapestry is early. The `SocialAdapter` interface pattern (one adapter per protocol behind a common contract) is the hedge — no adapter should touch core draw/payout logic.

## Recommended adapter roadmap

| Priority | Adapter | Effort | Rationale |
|---|---|---|---|
| 1 | Farcaster (Neynar + SIWF) | ~days | Crypto-native reach incl. Base App; verified Solana payout addresses on-profile |
| 2 | ActivityPub self-hosted module (Fedify) | ~1-2 wks | Whole fediverse + bridged Bluesky via one inbox (already in `appidea.md` roadmap) |
| 3 | Tapestry | ~days, deferred | Same-chain synergy; wait for consumer traction |
| — | Lens / Nostr / Binance Square | — | Revisit Lens post-transition; skip Nostr & Binance Square |

## Sources

- [Farcaster docs — architecture](https://docs.farcaster.xyz/learn/architecture/overview) · [Snapchain repo](https://github.com/farcasterxyz/snapchain) · [The Block — Snapchain launch](https://www.theblock.co/post/347606/decentralized-social-media-protocol-farcaster-launches-blockchain-like-data-layer-snapchain) · [FIP-11 Sign In With Farcaster](https://github.com/farcasterxyz/protocol/discussions/110) · [Datawallet — Farcaster explained](https://www.datawallet.com/crypto/farcaster-explained)
- [The Block — Coinbase unveils Base App](https://www.theblock.co/post/362713/coinbase-unveils-base-app-rebrands-wallet-as-all-in-one-social-and-trading-platform) · [CryptoSlate — Base App review 2026](https://cryptoslate.com/crypto-wallets/base-wallet-review/)
- [The Block — Lens Chain mainnet](https://www.theblock.co/post/349582/socialfi-protocol-lens-releases-lens-chain-mainnet-with-avail-da-and-zksync-tech) · [The Block — Mask Network takes over Lens](https://www.theblock.co/post/386293/mask-network-takes-over-lens-protocol-with-goal-to-build-products-people-actually-use) · [Lens docs](https://lens.xyz/docs/protocol)
- [The Block — Tapestry Series A](https://www.theblock.co/post/335251/solana-protocol-tapestry-funding) · [Solana Compass — Tapestry](https://solanacompass.com/projects/tapestry) · [Tapestry Graveyard Hackathon](https://blog.usetapestry.dev/p/solana-graveyard-hackathon)
- [Nostr.co.uk FAQ 2026](https://nostr.co.uk/faq/) · [NIP-57 zaps](https://www.e2encrypted.com/nostr/nips/57/) · [Lightning zaps usage](https://hoge.gg/lightning-wallets-nostr-zaps-2026/) · [Dan MacKinlay — Nostr notes](https://danmackinlay.name/notebook/nostr.html)
- [Binance Square Skill / posting API](https://blockchainreporter.net/how-to-use-binance-square-skill-for-ai-powered-content-automation/) · [Binance developer docs](https://developers.binance.com/en/docs/)
