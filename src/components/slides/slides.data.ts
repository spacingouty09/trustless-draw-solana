// Copy for the marketing slides at "/". Pure data — layout lives in
// slide-section.tsx and the route renders one section per entry.

import { PRODUCT_NAME } from "@/lib/product";

export type SlideIcon =
  | "eye-off"
  | "box"
  | "receipt"
  | "lock"
  | "ticket"
  | "scan"
  | "gift"
  | "shuffle"
  | "heart"
  | "handshake"
  | "wallet"
  | "shield"
  | "users"
  | "radio"
  | "flask"
  | "compass"
  | "trending"
  | "terminal"
  | "bot";

export type SlideCardData = { icon?: SlideIcon; title: string; body: string };

type SlideBase = { id: string; label: string; headline: string };

export type Slide =
  | (SlideBase & { kind: "hero"; eyebrow: string; body: string })
  | (SlideBase & {
      kind: "cards";
      cards: SlideCardData[];
      footnote?: string;
      numbered?: boolean;
      command?: string;
    })
  | (SlideBase & {
      kind: "platforms";
      live: string[];
      next: string[];
      footnote: string;
    })
  | (SlideBase & {
      kind: "table";
      columns: string[];
      rows: { label: string; cells: Cell[] }[];
    })
  | (SlideBase & { kind: "contact"; body: string });

export type Cell = "yes" | "no" | "partial";

export const SLIDES: readonly Slide[] = [
  {
    id: "slide-00",
    kind: "hero",
    label: "Intro",
    eyebrow: "Verifiable · On-chain · Agent-ready",
    headline: "Promises you can check.",
    body: "Get new creators from 0 to 1. Giveaways where the prize is locked before entry, every action is verified, and the winner is proven — not announced.",
  },
  {
    id: "slide-01",
    kind: "cards",
    label: "Problem",
    headline: "Zero followers. Zero trust.",
    cards: [
      {
        icon: "trending",
        title: "Stuck at zero",
        body: "Algorithms don't surface accounts nobody engages with yet.",
      },
      {
        icon: "eye-off",
        title: "Invisible prize",
        body: "Entrants can't tell if the reward exists.",
      },
      { icon: "box", title: "Black-box draw", body: "The winner is announced, never proven." },
      { icon: "receipt", title: "No receipt", body: "Nobody sees the payout land." },
    ],
    footnote: "Giveaways get new creators their first 50k — if people believe them.",
  },
  {
    id: "slide-02",
    kind: "cards",
    label: "How it works",
    headline: "Four steps. All public.",
    numbered: true,
    cards: [
      { title: "Commit", body: "Prize locked in an on-chain vault before entries open." },
      { title: "Verify", body: "Every like, follow and repost checked against the platform." },
      { title: "Draw", body: "Winners picked by verifiable on-chain randomness." },
      { title: "Settle", body: "Prizes land in winners' wallets. Nothing to claim." },
    ],
  },
  {
    id: "slide-03",
    kind: "cards",
    label: "Proof",
    headline: "Nothing to take on faith.",
    cards: [
      { icon: "lock", title: "The prize", body: "Locked in a vault no one holds a key to." },
      { icon: "ticket", title: "Your entry", body: "An NFT ticket in your own wallet." },
      { icon: "scan", title: "The outcome", body: "Draw and payout, auditable on any explorer." },
    ],
  },
  {
    id: "slide-04",
    kind: "platforms",
    label: "Platforms",
    headline: "One campaign. Every platform.",
    live: ["Farcaster", "Mastodon"],
    next: ["Bluesky", "YouTube", "Telegram", "Discord", "Reddit", "X"],
    footnote: "Actions are verified where they happen.",
  },
  {
    id: "slide-05",
    kind: "cards",
    label: "Use cases",
    headline: "A giveaway is just one shape.",
    cards: [
      { icon: "gift", title: "Giveaway", body: "Complete actions, earn an entry." },
      { icon: "shuffle", title: "Lucky draw", body: "One prize, many entrants, a provable pick." },
      { icon: "heart", title: "Charity", body: "Match donations, prove the match landed." },
      { icon: "handshake", title: "Commitment", body: "Lock a bond behind a promise." },
    ],
  },
  {
    id: "slide-06",
    kind: "cards",
    label: "Agents",
    headline: "Agents can run a channel. We get it from 0 to 1.",
    command: "claude mcp add --transport http fairseed https://luckydraw.y09.space/mcp",
    cards: [
      {
        icon: "terminal",
        title: "One command",
        body: "Connect your agent to Fairseed. No human in the loop.",
      },
      {
        icon: "bot",
        title: "Runs on autopilot",
        body: "Launch, verify and settle campaigns automatically.",
      },
      {
        icon: "trending",
        title: "First momentum",
        body: "Giveaways push a new channel past the algorithm's cold start.",
      },
    ],
  },
  {
    id: "slide-07",
    kind: "table",
    label: "Compare",
    headline: "What the alternatives skip.",
    columns: ["Gleam.io", "Raffle dApps", PRODUCT_NAME],
    rows: [
      { label: "Multi-platform actions", cells: ["yes", "no", "yes"] },
      { label: "Verified engagement", cells: ["partial", "no", "yes"] },
      { label: "Prize locked before entry", cells: ["no", "partial", "yes"] },
      { label: "Auditable draw", cells: ["no", "yes", "yes"] },
      { label: "Public payout trail", cells: ["no", "yes", "yes"] },
    ],
  },
  {
    id: "slide-08",
    kind: "cards",
    label: "Status",
    headline: "Where we are.",
    cards: [
      { icon: "radio", title: "Live", body: "Mastodon and Farcaster campaigns, end to end." },
      { icon: "flask", title: "Devnet", body: "Running on Solana devnet. Mainnet next." },
      { icon: "compass", title: "Next", body: "Bluesky, YouTube, Telegram." },
    ],
  },
  {
    id: "slide-09",
    kind: "contact",
    label: "Contact",
    headline: "Have a campaign worth proving?",
    body: "Run one, or tell us what you'd lock on-chain.",
  },
];
