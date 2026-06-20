import { useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";
import { shortAddr } from "@/lib/solana";

export function WalletButton() {
  const { wallets, select, connect, disconnect, connected, connecting, publicKey } = useWallet();
  const [open, setOpen] = useState(false);

  if (connected && publicKey) {
    return (
      <button
        onClick={() => disconnect()}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-primary/50 bg-primary/10 px-3 font-mono text-xs text-primary transition-colors hover:bg-primary/20"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_6px_oklch(0.78_0.19_162)]" />
        {shortAddr(publicKey.toBase58())}
      </button>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        disabled={connecting}
        className="inline-flex h-9 items-center rounded-lg bg-gradient-brand px-4 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {connecting ? "Connecting…" : "Connect wallet"}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(false)}
        className="inline-flex h-9 items-center rounded-lg border border-border bg-card px-3 text-xs"
      >
        Close
      </button>
      <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-popover p-2 shadow-xl">
        <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
          Select wallet
        </div>
        {wallets.filter((w) => w.readyState === "Installed" || w.readyState === "Loadable").length === 0 && (
          <div className="px-2 py-2 text-xs text-muted-foreground">
            No wallets detected. Install Phantom or Solflare.
          </div>
        )}
        {wallets.map((w) => (
          <button
            key={w.adapter.name}
            onClick={async () => {
              setOpen(false);
              try {
                select(w.adapter.name);
                // Wait a tick so the provider state updates before connect().
                await new Promise((r) => setTimeout(r, 100));
                await connect();
              } catch (err) {
                console.error("Wallet connect failed", err);
              }
            }}
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-secondary"
          >
            {w.adapter.icon && <img src={w.adapter.icon} alt="" className="h-5 w-5" />}
            <span>{w.adapter.name}</span>
            <span className="ml-auto text-[10px] text-muted-foreground">{w.readyState}</span>
          </button>
        ))}
      </div>
    </div>
  );
}