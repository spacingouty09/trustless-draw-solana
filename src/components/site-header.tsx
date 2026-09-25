import { Link } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { Sprout } from "lucide-react";
import { ClientOnly } from "./client-only";
import { PRODUCT_NAME } from "@/lib/product";

const WalletButton = lazy(() =>
  import("./wallet-button").then((m) => ({ default: m.WalletButton })),
);

function WalletButtonFallback() {
  return <div className="h-9 w-32 animate-pulse rounded-lg bg-muted" />;
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-[var(--header-h)] max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-brand glow-primary">
            <Sprout className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
          </div>
          <span className="font-display text-lg font-semibold tracking-tight">{PRODUCT_NAME}</span>
          <span className="ml-2 hidden rounded-full border border-border/70 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground sm:inline-block">
            Devnet
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link
            to="/campaigns"
            className="text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "text-foreground" }}
          >
            Campaigns
          </Link>
          <Link
            to="/organizer"
            className="text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "text-foreground" }}
          >
            Organizer
          </Link>
          <Link
            to="/support"
            className="text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "text-foreground" }}
          >
            Support
          </Link>
          <ClientOnly fallback={<WalletButtonFallback />}>
            <Suspense fallback={<WalletButtonFallback />}>
              <WalletButton />
            </Suspense>
          </ClientOnly>
        </nav>
      </div>
    </header>
  );
}
