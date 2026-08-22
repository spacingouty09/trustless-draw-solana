import "@/lib/buffer-polyfill";
import { useWallet } from "@solana/wallet-adapter-react";
import { Check, ChevronDown, Copy, ExternalLink, LogOut, Wallet as WalletIcon } from "lucide-react";
import { toast } from "sonner";
import { explorerAddr, shortAddr } from "@/lib/solana";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function WalletButton() {
  const { wallets, wallet, select, disconnect, connected, connecting, publicKey } = useWallet();

  const installed = wallets.filter(
    (w) => w.readyState === "Installed" || w.readyState === "Loadable",
  );
  const other = wallets.filter((w) => !installed.includes(w));

  // `select()` only records the choice — WalletProvider's own autoConnect
  // effect (see wallet-provider.tsx) does the actual adapter.connect() once
  // React state settles on the new adapter. Calling connect() ourselves here
  // would close over a stale `wallet` from this render (still null right
  // after a disconnect) and throw WalletNotSelectedError even though the
  // real connection succeeds a moment later.
  function pick(name: (typeof wallets)[number]["adapter"]["name"]) {
    select(name);
  }

  function copyAddress() {
    if (!publicKey) return;
    navigator.clipboard?.writeText(publicKey.toBase58());
    toast.success("Address copied");
  }

  const walletList = (
    <>
      {installed.length === 0 && other.length === 0 && (
        <div className="px-2 py-2 text-xs text-muted-foreground">
          No wallets detected. Install Phantom or Solflare.
        </div>
      )}
      {installed.length > 0 && (
        <>
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Detected
          </DropdownMenuLabel>
          {installed.map((w) => (
            <WalletRow
              key={w.adapter.name}
              adapter={w.adapter}
              active={connected && wallet?.adapter.name === w.adapter.name}
              busy={connecting && wallet?.adapter.name === w.adapter.name}
              onSelect={() => pick(w.adapter.name)}
            />
          ))}
        </>
      )}
      {other.length > 0 && (
        <>
          {installed.length > 0 && <DropdownMenuSeparator />}
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Not installed
          </DropdownMenuLabel>
          {other.map((w) => (
            <WalletRow
              key={w.adapter.name}
              adapter={w.adapter}
              active={false}
              busy={false}
              onSelect={() => window.open(w.adapter.url, "_blank", "noopener,noreferrer")}
              readyState={w.readyState}
            />
          ))}
        </>
      )}
    </>
  );

  if (connected && publicKey) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-primary/50 bg-primary/10 px-3 font-mono text-xs text-primary transition-colors hover:bg-primary/20 data-[state=open]:bg-primary/20">
            <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_6px_oklch(0.78_0.19_162)]" />
            {shortAddr(publicKey.toBase58())}
            <ChevronDown className="h-3 w-3 opacity-70" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="flex items-center gap-2 font-mono text-xs font-normal text-muted-foreground">
            {wallet?.adapter.icon && (
              <img src={wallet.adapter.icon} alt="" className="h-4 w-4 rounded" />
            )}
            {shortAddr(publicKey.toBase58())}
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={copyAddress} className="gap-2">
            <Copy className="h-3.5 w-3.5" /> Copy address
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="gap-2">
            <a href={explorerAddr(publicKey.toBase58())} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" /> View on explorer
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Switch wallet
          </DropdownMenuLabel>
          {walletList}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => disconnect()}
            className="gap-2 text-destructive focus:text-destructive"
          >
            <LogOut className="h-3.5 w-3.5" /> Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          disabled={connecting}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-gradient-brand px-4 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <WalletIcon className="h-3.5 w-3.5" />
          {connecting ? "Connecting…" : "Connect wallet"}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Select wallet
        </DropdownMenuLabel>
        {walletList}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function WalletRow({
  adapter,
  active,
  busy,
  onSelect,
  readyState,
}: {
  adapter: { name: string; icon: string };
  active: boolean;
  busy: boolean;
  onSelect: () => void;
  readyState?: string;
}) {
  return (
    <DropdownMenuItem onClick={onSelect} disabled={busy} className="gap-2">
      {adapter.icon ? (
        <img src={adapter.icon} alt="" className="h-5 w-5 rounded" />
      ) : (
        <WalletIcon className="h-5 w-5" />
      )}
      <span className="flex-1">{adapter.name}</span>
      {busy && <span className="text-[10px] text-muted-foreground">Connecting…</span>}
      {!busy && active && <Check className="h-3.5 w-3.5 text-primary" />}
      {!busy && !active && readyState && readyState !== "Installed" && (
        <span className="text-[10px] text-muted-foreground">Install</span>
      )}
    </DropdownMenuItem>
  );
}
