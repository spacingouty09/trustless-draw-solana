// Client-side helper to produce a fresh signed challenge for privileged
// server actions. The server (wallet-auth.server.ts) verifies the ed25519
// signature against the wallet pubkey before executing the action.

import bs58 from "bs58";

export type SignedAuth = {
  pubkey: string;
  signature: string;
  issued_at: string;
};

export async function signWalletAction(args: {
  signMessage: (msg: Uint8Array) => Promise<Uint8Array>;
  pubkey: string;
  action: string;
  eventId: string;
}): Promise<SignedAuth> {
  const issued_at = new Date().toISOString();
  const message = `chaindraw:${args.action}:${args.eventId}:${issued_at}`;
  const sigBytes = await args.signMessage(new TextEncoder().encode(message));
  return {
    pubkey: args.pubkey,
    signature: bs58.encode(sigBytes),
    issued_at,
  };
}
