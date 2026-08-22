// Server-only Sign In With Farcaster (FIP-11) verification + session cookie.
// Reuses the HMAC-signed cookie machinery from mastodon-auth.server.ts so both
// platform sessions behave identically.

import { signPayload, verifyPayload, parseCookies, buildCookie, clearCookie } from "./mastodon-auth.server";

const FC_SESSION_COOKIE = "fc_session";
const FC_SESSION_TTL_SECONDS = 60 * 60; // 1 hour, matches Mastodon session

export type FarcasterSession = {
  fid: number;
  username: string;
  sol_address: string | null;
  exp?: number;
};

/**
 * Verify a SIWF message+signature produced by @farcaster/auth-kit.
 * Uses @farcaster/auth-client, which checks the SIWE signature against the
 * fid's custody/auth keys via the public OP Mainnet ID registry.
 */
export async function verifySiwf(args: {
  message: string;
  signature: `0x${string}`;
  domain: string;
  nonce: string;
  acceptAuthAddress?: boolean;
}): Promise<{ fid: number }> {
  const { createAppClient, viemConnector } = await import("@farcaster/auth-client");
  const appClient = createAppClient({ ethereum: viemConnector() });
  const result = await appClient.verifySignInMessage({
    message: args.message,
    signature: args.signature,
    domain: args.domain,
    nonce: args.nonce,
    acceptAuthAddress: args.acceptAuthAddress ?? true,
  });
  if (!result.success) {
    const detail = (result as { error?: { message?: string } }).error?.message;
    throw new Error(`Farcaster sign-in verification failed${detail ? `: ${detail}` : ""}`);
  }
  return { fid: result.fid };
}

export async function mintFarcasterSession(session: Omit<FarcasterSession, "exp">): Promise<string> {
  return signPayload(session, FC_SESSION_TTL_SECONDS);
}

export async function readFarcasterSession(
  cookieHeader: string | null | undefined,
): Promise<FarcasterSession | null> {
  const cookies = parseCookies(cookieHeader);
  const token = cookies[FC_SESSION_COOKIE];
  if (!token) return null;
  return verifyPayload<FarcasterSession>(token);
}

export const FC_COOKIE = {
  name: FC_SESSION_COOKIE,
  ttl: FC_SESSION_TTL_SECONDS,
  build: (value: string, secure: boolean) =>
    buildCookie(FC_SESSION_COOKIE, value, { maxAge: FC_SESSION_TTL_SECONDS, secure }),
  clear: (secure: boolean) => clearCookie(FC_SESSION_COOKIE, secure),
};
