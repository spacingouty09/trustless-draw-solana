import { Link } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { ClientOnly } from "./client-only";

const WalletButton = lazy(() =>
  import("./wallet-button").then((m) => ({ default: m.WalletButton })),
);

function WalletButtonFallback() {
  return <div className="h-9 w-32 animate-pulse rounded-lg bg-muted" />;
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-brand glow-primary">
            <span className="text-sm font-bold text-primary-foreground">⛓</span>
          </div>
          <span className="text-lg font-semibold tracking-tight">ChainDraw</span>
          <span className="ml-2 hidden rounded-full border border-border/70 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground sm:inline-block">
            Devnet
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link
            to="/"
            className="text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "text-foreground" }}
            activeOptions={{ exact: true }}
          >
            Browse
          </Link>
          <Link
            to="/organizer"
            className="text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "text-foreground" }}
          >
            Organizer
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
