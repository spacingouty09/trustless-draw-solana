// Server-only ed25519 signature verification for Solana wallet authentication.
// Verifies that a given base58 pubkey signed a deterministic challenge message,
// so that knowing the public organizer_pubkey is not enough to call privileged
// server functions — the caller must also control the matching private key.

import { ed25519 } from "@noble/curves/ed25519.js";
import bs58 from "bs58";

const MAX_SKEW_MS = 5 * 60 * 1000; // 5 minutes

export function buildChallenge(action: string, eventId: string, issuedAt: string) {
  return `chaindraw:${action}:${eventId}:${issuedAt}`;
}

export function verifyWalletSignature(args: {
  pubkey: string;
  signature: string; // base58
  action: string;
  eventId: string;
  issuedAt: string; // ISO timestamp
}): { ok: true } | { ok: false; reason: string } {
  try {
    const ts = Date.parse(args.issuedAt);
    if (Number.isNaN(ts)) return { ok: false, reason: "Invalid signature timestamp" };
    if (Math.abs(Date.now() - ts) > MAX_SKEW_MS)
      return { ok: false, reason: "Signature expired — please retry" };

    const pubBytes = bs58.decode(args.pubkey);
    if (pubBytes.length !== 32) return { ok: false, reason: "Invalid pubkey" };
    const sigBytes = bs58.decode(args.signature);
    if (sigBytes.length !== 64) return { ok: false, reason: "Invalid signature" };

    const message = new TextEncoder().encode(
      buildChallenge(args.action, args.eventId, args.issuedAt),
    );
    const ok = ed25519.verify(sigBytes, message, pubBytes);
    return ok ? { ok: true } : { ok: false, reason: "Signature does not match pubkey" };
  } catch (e) {
    return { ok: false, reason: `Signature verification failed: ${(e as Error).message}` };
  }
}
