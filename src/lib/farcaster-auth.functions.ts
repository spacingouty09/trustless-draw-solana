import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Completes Sign In With Farcaster: the client runs the auth-kit relay flow
// (QR / deeplink) and posts the signed SIWE message here. We verify it against
// the fid's custody/auth keys, enrich with the profile's verified Solana
// address via Neynar, and mint an HMAC-signed session cookie.
export const verifyFarcasterLogin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        message: z.string().min(20),
        signature: z.string().regex(/^0x[0-9a-fA-F]+$/),
        fid: z.number().int().positive(),
        nonce: z.string().min(8),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { getRequest, setResponseHeader } = await import("@tanstack/react-start/server");
    const { verifySiwf, mintFarcasterSession, FC_COOKIE } = await import("./farcaster-auth.server");
    const { getUser, verifiedSolanaAddress } = await import("./farcaster.server");

    const req = getRequest();
    const reqUrl = new URL(req.url);
    const fwdHost = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    const domain = fwdHost && !/^localhost(?::|$)/i.test(fwdHost) ? fwdHost : reqUrl.host;

    const { fid } = await verifySiwf({
      message: data.message,
      signature: data.signature as `0x${string}`,
      domain,
      nonce: data.nonce,
    });
    if (fid !== data.fid) throw new Error("Signed-in fid does not match the requested fid");

    const user = await getUser(fid);
    const sol = verifiedSolanaAddress(user);

    const token = await mintFarcasterSession({
      fid,
      username: user.username,
      sol_address: sol,
    });
    const secure = reqUrl.protocol === "https:";
    setResponseHeader("Set-Cookie", FC_COOKIE.build(token, secure));

    return { ok: true as const, fid, username: user.username, sol_address: sol };
  });

export const getFarcasterSession = createServerFn({ method: "GET" }).handler(async () => {
  const { getRequestHeader } = await import("@tanstack/react-start/server");
  const { readFarcasterSession } = await import("./farcaster-auth.server");
  const session = await readFarcasterSession(getRequestHeader("cookie"));
  if (!session) return null;
  return { fid: session.fid, username: session.username, sol_address: session.sol_address };
});

export const signOutFarcaster = createServerFn({ method: "POST" }).handler(async () => {
  const { getRequest, setResponseHeader } = await import("@tanstack/react-start/server");
  const { FC_COOKIE } = await import("./farcaster-auth.server");
  const secure = new URL(getRequest().url).protocol === "https:";
  setResponseHeader("Set-Cookie", FC_COOKIE.clear(secure));
  return { ok: true };
});
