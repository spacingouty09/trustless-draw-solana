import "@/lib/buffer-polyfill";
import { useCallback, useMemo, type ReactNode } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { WalletNotReadyError, type WalletError } from "@solana/wallet-adapter-base";
import { toast } from "sonner";
import { DEVNET_RPC } from "@/lib/solana";

export function SolanaWalletProvider({ children }: { children: ReactNode }) {
  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);

  // Connections happen through select() + the library's own autoConnect
  // effect rather than an explicit awaited connect() (see wallet-button.tsx),
  // so failures surface here instead of at the call site.
  const onWalletError = useCallback((error: WalletError) => {
    // WalletNotReadyError already opens the wallet's install page; no toast needed.
    if (error instanceof WalletNotReadyError) return;
    console.error("Wallet error", error);
    toast.error("Wallet error", { description: error.message || undefined });
  }, []);

  return (
    <ConnectionProvider endpoint={DEVNET_RPC}>
      <WalletProvider wallets={wallets} autoConnect onError={onWalletError}>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}
