// Browser-side Solana helpers. Devnet only.
// NOTE: @solana/web3.js pulls in `rpc-websockets`, which has no `workerd`
// export condition and breaks the Cloudflare Worker SSR build. We therefore
// lazy-import it inside async functions so the module graph stays clean for
// the worker bundle. Pure helpers (explorerTx, shortAddr) carry no runtime
// dep on web3.js and remain safe to import anywhere.
import type { PublicKey as PublicKeyT, Transaction as TransactionT } from "@solana/web3.js";

async function loadWeb3() {
  const [{ Buffer }, web3] = await Promise.all([import("buffer"), import("@solana/web3.js")]);
  if (typeof globalThis !== "undefined" && !(globalThis as { Buffer?: unknown }).Buffer) {
    (globalThis as { Buffer?: unknown }).Buffer = Buffer;
  }
  return { Buffer, ...web3 };
}

// All RPC calls go through our server-side proxy (`/api/public/solana-rpc`),
// which forwards to the upstream provider using the `SOLANA_RPC` secret.
// This keeps any provider API key out of the client bundle. The Solana
// Connection requires an absolute URL, so we build one from the current
// origin in the browser. SSR never hits the wallet stack (gated by
// <ClientOnly>), so the fallback is only used for type safety.
export const DEVNET_RPC: string =
  typeof window !== "undefined"
    ? `${window.location.origin}/api/public/solana-rpc`
    : "https://api.devnet.solana.com";

const MEMO_PROGRAM_ID_STR = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

export async function getConnection() {
  const { Connection } = await loadWeb3();
  return new Connection(DEVNET_RPC, "confirmed");
}

/**
 * MVP commitment: sends a Memo program tx on devnet encoding the campaign
 * id + prize total. The tx signature stands in as a public, immutable
 * commitment that anyone can verify on Explorer.
 *
 * TODO: swap for `createFixedDelegation` from @solana/subscriptions once
 * the audited program SDK is integrated.
 */
export async function sendCommitMemo(args: {
  payer: PublicKeyT;
  signTransaction: (tx: TransactionT) => Promise<TransactionT>;
  campaignId: string;
  amount: number;
  token: string;
}): Promise<string> {
  const {
    Connection,
    PublicKey,
    Transaction,
    TransactionInstruction,
    SystemProgram,
    LAMPORTS_PER_SOL,
    Buffer,
  } = await loadWeb3();
  const connection = new Connection(DEVNET_RPC, "confirmed");
  const memo = `chaindraw:commit:${args.campaignId}:${args.amount}:${args.token}`;
  const ix = new TransactionInstruction({
    keys: [{ pubkey: args.payer, isSigner: true, isWritable: true }],
    programId: new PublicKey(MEMO_PROGRAM_ID_STR),
    data: Buffer.from(memo, "utf8"),
  });
  // dust self-transfer to ensure the tx is non-trivial
  const dust = SystemProgram.transfer({
    fromPubkey: args.payer,
    toPubkey: args.payer,
    lamports: Math.floor(0.000001 * LAMPORTS_PER_SOL),
  });
  const tx = new Transaction().add(ix, dust);
  tx.feePayer = args.payer;
  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  const signed = await args.signTransaction(tx);
  const sig = await connection.sendRawTransaction(signed.serialize());
  await connection.confirmTransaction(sig, "confirmed");
  return sig;
}

export async function sendPayoutMemo(args: {
  payer: PublicKeyT;
  signTransaction: (tx: TransactionT) => Promise<TransactionT>;
  campaignId: string;
  winnerWallet: string;
  share: number;
}): Promise<string> {
  const {
    Connection,
    PublicKey,
    Transaction,
    TransactionInstruction,
    SystemProgram,
    LAMPORTS_PER_SOL,
    Buffer,
  } = await loadWeb3();
  const connection = new Connection(DEVNET_RPC, "confirmed");
  const memo = `chaindraw:payout:${args.campaignId}:${args.winnerWallet}:${args.share}`;
  const ix = new TransactionInstruction({
    keys: [{ pubkey: args.payer, isSigner: true, isWritable: true }],
    programId: new PublicKey(MEMO_PROGRAM_ID_STR),
    data: Buffer.from(memo, "utf8"),
  });
  // demo-grade: send a dust lamport to winner so they see *something* hit their wallet
  const dust = SystemProgram.transfer({
    fromPubkey: args.payer,
    toPubkey: new PublicKey(args.winnerWallet),
    lamports: Math.floor(0.0001 * LAMPORTS_PER_SOL),
  });
  const tx = new Transaction().add(ix, dust);
  tx.feePayer = args.payer;
  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  const signed = await args.signTransaction(tx);
  const sig = await connection.sendRawTransaction(signed.serialize());
  await connection.confirmTransaction(sig, "confirmed");
  return sig;
}

export function explorerTx(sig: string) {
  return `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
}

export function explorerAddr(addr: string) {
  return `https://explorer.solana.com/address/${addr}?cluster=devnet`;
}

export function shortAddr(addr: string) {
  if (!addr) return "";
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export async function getSolBalance(address: string) {
  try {
    const { Connection, PublicKey, LAMPORTS_PER_SOL } = await loadWeb3();
    const connection = new Connection(DEVNET_RPC, "confirmed");
    const lamports = await connection.getBalance(new PublicKey(address));
    return lamports / LAMPORTS_PER_SOL;
  } catch {
    return null;
  }
}
