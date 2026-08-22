import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  NetworkSolana,
  NetworkEthereum,
  NetworkBitcoin,
  NetworkRobinhood,
  NetworkMonad,
  NetworkBase,
  NetworkSui,
  NetworkPolygon,
  NetworkHyperEvm,
} from "@web3icons/react";
import { getWalletAddresses, subscribeEmail, submitSuggestion } from "@/lib/support.functions";
import { PRODUCT_NAME } from "@/lib/product";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: `Support ${PRODUCT_NAME}` },
      {
        name: "description",
        content: `Follow updates, support development, or send feedback on ${PRODUCT_NAME}.`,
      },
    ],
  }),
  component: SupportPage,
});

function SupportPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-6 py-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Support {PRODUCT_NAME}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The giveaway product above is a live devnet MVP. If you want to follow where it's
          headed, help fund development, or tell us what to build next — this is the page.
        </p>
      </div>
      <EmailSignupCard />
      <DonationCard />
      <FeedbackCard />
    </div>
  );
}

function EmailSignupCard() {
  const [email, setEmail] = useState("");
  const subscribe = useServerFn(subscribeEmail);
  const mutation = useMutation({
    mutationFn: (email: string) => subscribe({ data: { email } }),
    onSuccess: () => {
      toast.success("You're on the list — we'll email you updates.");
      setEmail("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!email.includes("@")) {
          toast.error("Enter a valid email");
          return;
        }
        mutation.mutate(email);
      }}
      className="rounded-2xl border border-border/70 bg-card/60 p-6"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Get updates
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        No spam — just launches, on-chain program progress, and new platform support.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="h-11 flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none ring-ring focus:ring-2"
        />
        <button
          type="submit"
          disabled={mutation.isPending || !email}
          className="inline-flex h-11 items-center justify-center rounded-lg bg-gradient-brand px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {mutation.isPending ? "Adding…" : "Sign up"}
        </button>
      </div>
    </form>
  );
}

// Network list + order matches Phantom's own "Receive → Change Network"
// screen exactly (per user-provided screenshot), including Bitcoin split
// into its two address types.
type NetworkKey =
  | "SOLANA"
  | "ETHEREUM"
  | "BITCOIN_TAPROOT"
  | "BITCOIN_NATIVE_SEGWIT"
  | "ROBINHOOD_CHAIN"
  | "MONAD"
  | "BASE"
  | "SUI"
  | "POLYGON"
  | "HYPEREVM";

// Real brand marks via @web3icons/react (web3icons.io) — same source
// Phantom's own network list draws from, covering every network including
// Monad/HyperEVM/Robinhood which have no simple-icons entry. `variant="mono"`
// matches Phantom's flat white-on-dark-circle treatment exactly.
const NETWORK_ICONS: Record<NetworkKey, typeof NetworkSolana> = {
  SOLANA: NetworkSolana,
  ETHEREUM: NetworkEthereum,
  BITCOIN_TAPROOT: NetworkBitcoin,
  BITCOIN_NATIVE_SEGWIT: NetworkBitcoin,
  ROBINHOOD_CHAIN: NetworkRobinhood,
  MONAD: NetworkMonad,
  BASE: NetworkBase,
  SUI: NetworkSui,
  POLYGON: NetworkPolygon,
  HYPEREVM: NetworkHyperEvm,
};

const NETWORKS: Array<{ key: NetworkKey; label: string; badge?: string }> = [
  { key: "SOLANA", label: "Solana" },
  { key: "ETHEREUM", label: "Ethereum" },
  { key: "BITCOIN_TAPROOT", label: "Bitcoin", badge: "Taproot" },
  { key: "BITCOIN_NATIVE_SEGWIT", label: "Bitcoin", badge: "Native Segwit" },
  { key: "ROBINHOOD_CHAIN", label: "Robinhood Chain" },
  { key: "MONAD", label: "Monad" },
  { key: "BASE", label: "Base" },
  { key: "SUI", label: "Sui" },
  { key: "POLYGON", label: "Polygon" },
  { key: "HYPEREVM", label: "HyperEVM", badge: "Lite" },
];

function DonationCard() {
  const fetchAddresses = useServerFn(getWalletAddresses);
  const { data: addresses } = useQuery({
    queryKey: ["wallet-addresses"],
    queryFn: () => fetchAddresses(),
  });

  return (
    <div className="rounded-2xl border border-border/70 bg-card/60 p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Support development
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Donations go straight to funding {PRODUCT_NAME}'s build — the on-chain program, more platform
        adapters, mainnet launch. Tap a network to copy its address.
      </p>
      <div className="mt-4 grid grid-cols-5 gap-x-2 gap-y-4">
        {NETWORKS.map((n) => {
          const address = addresses?.[n.key];
          const enabled = !!address;
          const NetworkIcon = NETWORK_ICONS[n.key];
          return (
            <button
              key={n.key}
              type="button"
              disabled={!enabled}
              title={enabled ? `Copy ${n.label} address` : `${n.label} — coming soon`}
              onClick={() => {
                if (!address) return;
                navigator.clipboard?.writeText(address);
                toast.success(`Copied ${n.label} address`);
              }}
              className="group flex flex-col items-center gap-1.5 disabled:cursor-not-allowed"
            >
              <div
                className={`grid h-11 w-11 place-items-center rounded-full border border-border/70 bg-secondary/50 transition-all ${
                  enabled ? "group-hover:scale-105 group-hover:border-primary/60" : "opacity-40"
                }`}
              >
                <NetworkIcon variant="mono" size={18} color="currentColor" />
              </div>
              <span className="text-center text-[10px] leading-tight text-muted-foreground">
                {n.label}
                {n.badge && (
                  <>
                    <br />
                    <span className="text-[9px] text-muted-foreground/70">{n.badge}</span>
                  </>
                )}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-[11px] text-muted-foreground">
        Ethereum, Base, Polygon, HyperEVM, and Robinhood Chain are EVM networks — the same address
        usually works across all of them unless different ones are configured below.
      </p>
    </div>
  );
}

function FeedbackCard() {
  const [message, setMessage] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const submit = useServerFn(submitSuggestion);
  const mutation = useMutation({
    mutationFn: (vars: { message: string; contact_email: string; website: string }) =>
      submit({ data: vars }),
    onSuccess: () => {
      toast.success("Thanks — we read every suggestion.");
      setMessage("");
      setContactEmail("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (message.trim().length < 10) {
          toast.error("Tell us a bit more — at least 10 characters.");
          return;
        }
        mutation.mutate({ message, contact_email: contactEmail, website: honeypot });
      }}
      className="rounded-2xl border border-border/70 bg-card/60 p-6"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Suggest something
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        What should we build, fix, or do differently?
      </p>
      {/* Honeypot — hidden from real users, bots tend to fill every field */}
      <input
        type="text"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="I'd love to see..."
        rows={4}
        className="mt-4 w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none ring-ring focus:ring-2"
      />
      <input
        type="email"
        value={contactEmail}
        onChange={(e) => setContactEmail(e.target.value)}
        placeholder="Your email (optional, if you want a reply)"
        className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none ring-ring focus:ring-2"
      />
      <button
        type="submit"
        disabled={mutation.isPending || message.trim().length < 10}
        className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-lg bg-gradient-brand text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40 sm:w-auto sm:px-6"
      >
        {mutation.isPending ? "Sending…" : "Send suggestion"}
      </button>
    </form>
  );
}
