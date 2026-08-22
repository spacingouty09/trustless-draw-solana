# Idea Context — ChainDraw

**Idea:** Web3 Gleam.io — verifiable multi-platform engagement campaigns. Organizers commit prizes on-chain, define an action checklist spanning platforms (Farcaster, Bluesky, Mastodon, YouTube, Telegram, Weibo…), every action is API-verified, winners drawn auditably, payouts public. Bridges web2↔web3: solves web2's giveaway trust problem with web3 rails and channels web3 users into engagement for traditional social accounts. Devnet MVP live at https://luckydraw.y09.space. See `appidea.md` (platform tier matrix), `social-protocols-research.md`.

**Phase:** Idea → validated three times:
- Sprint 1 (Mastodon-first): *pivot*, 0.6 — `validation-report.html`
- Sprint 2 (Farcaster pivot): **go**, 0.75 — `validation-report-farcaster.html`
- Sprint 3 (web3-Gleam multi-platform reframe): **go (positioning condition)**, 0.7 — `validation-report-web3gleam.html`

Cleared for **Build**.

```json
{
  "validation": {
    "demand_signals": [
      "Organizer budget proven at category scale: 23+ web3 quest platforms sustain paid campaign tooling (The Grid directory); Galxe alone reaches millions",
      "Web2 incumbent confirms demand: Gleam.io ships dedicated crypto-giveaway templates",
      "Industry's loudest pain is verifiability: 80%+ sybil participation in unprotected campaigns; weak web2 social verification widely cited — ChainDraw's verified-identity model attacks it directly",
      "Sprint 1-2 signals stand: Farcaster giveaway tools with real usage (Cast Picker, Superchain Raffle); no Solana product does free social-engagement giveaways"
    ],
    "risks": [
      { "category": "market", "description": "Positioning drift into the quest-platform category (owned by Galxe/Zealy/Layer3) — must market as provably-fair giveaways on platforms nobody else verifies, and avoid X/Discord head-on initially", "severity": "high" },
      { "category": "product", "description": "Sybil/bot entries hollow out the verified-engagement promise at scale — plan POH (proof-of-human) integration + per-platform heuristics", "severity": "medium" },
      { "category": "product", "description": "Memo commitment + server seed until escrow/VRF — don't over-claim trustless in marketing", "severity": "medium" },
      { "category": "regulatory", "description": "Sweepstakes rules multiply per jurisdiction; Weibo crypto-prize gray zone documented in appidea.md", "severity": "medium" },
      { "category": "technical", "description": "Multi-platform actions schema refactor touches all flows; per-platform API quotas at scale", "severity": "low" }
    ],
    "go_no_go": "go",
    "confidence": 0.7,
    "next_steps": [
      "BUILD: campaign_actions + action_completions + linked participant identities schema (multi-platform seam FIRST — retrofit later would be painful)",
      "BUILD: Farcaster adapter on new schema (SIWF + Neynar; auto payout wallet from verified Solana address; reaches Base App free)",
      "BUILD: Bluesky adapter (public AT Protocol data, $0)",
      "BUILD: reply-code verification engine (unlocks YouTube/Instagram/Threads/X-free)",
      "POSITIONING: never 'quest platform' — 'provably fair giveaways on platforms nobody else can verify'",
      "SYBIL: integrate Proof-of-Human API (superstack verify-humanity-poh skill available) before scaling",
      "INTEGRATION-FIRST: platform APIs + Switchboard/ORAO VRF + POH; custom on-chain code only for the future escrow program"
    ]
  }
}
```
