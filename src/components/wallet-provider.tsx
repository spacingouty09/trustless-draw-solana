import { useMemo, type ReactNode } from "react";
import { Buffer } from "buffer";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { DEVNET_RPC } from "@/lib/solana";

// @solana/web3.js (and the wallet adapter transitive deps) reference Buffer
// at module-init time. Browsers don't provide it, so polyfill before any
// adapter code touches it. Also expose `process` to keep adapters happy.
if (typeof globalThis !== "undefined") {
  const g = globalThis as {
    Buffer?: unknown;
    global?: unknown;
    process?: { env: Record<string, string> };
  };
  if (!g.Buffer) g.Buffer = Buffer;
  if (!g.global) g.global = globalThis;
  if (!g.process) g.process = { env: {} };
}

export function SolanaWalletProvider({ children }: { children: ReactNode }) {
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    [],
  );
  return (
    <ConnectionProvider endpoint={DEVNET_RPC}>
      <WalletProvider wallets={wallets} autoConnect>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}