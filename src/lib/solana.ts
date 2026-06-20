// Browser-side Solana helpers. Devnet only.
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { Buffer } from "buffer";

// Ensure Buffer exists on window for web3.js
if (typeof globalThis !== "undefined" && !(globalThis as { Buffer?: unknown }).Buffer) {
  (globalThis as { Buffer?: unknown }).Buffer = Buffer;
}

export const DEVNET_RPC = "https://api.devnet.solana.com";

const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
);

export function getConnection() {
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
  payer: PublicKey;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
  campaignId: string;
  amount: number;
  token: string;
}): Promise<string> {
  const connection = getConnection();
  const memo = `chaindraw:commit:${args.campaignId}:${args.amount}:${args.token}`;
  const ix = new TransactionInstruction({
    keys: [{ pubkey: args.payer, isSigner: true, isWritable: true }],
    programId: MEMO_PROGRAM_ID,
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
  payer: PublicKey;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
  campaignId: string;
  winnerWallet: string;
  share: number;
}): Promise<string> {
  const connection = getConnection();
  const memo = `chaindraw:payout:${args.campaignId}:${args.winnerWallet}:${args.share}`;
  const ix = new TransactionInstruction({
    keys: [{ pubkey: args.payer, isSigner: true, isWritable: true }],
    programId: MEMO_PROGRAM_ID,
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
    const lamports = await getConnection().getBalance(new PublicKey(address));
    return lamports / LAMPORTS_PER_SOL;
  } catch {
    return null;
  }
}