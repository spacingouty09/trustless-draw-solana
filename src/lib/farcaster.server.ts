// Farcaster adapter — server-only. Uses the Neynar REST API (canonical
// Farcaster API since Neynar assumed protocol stewardship in Jan 2026).
// Requires NEYNAR_API_KEY. All engagement checks use viewer_context so a
// verification is a single API call per action instead of paginating
// reaction lists.

const NEYNAR_BASE = "https://api.neynar.com/v2/farcaster";

function apiKey(): string {
  const k = process.env.NEYNAR_API_KEY;
  if (!k) throw new Error("NEYNAR_API_KEY is not configured");
  return k;
}

async function neynar<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${NEYNAR_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, {
    headers: { "x-api-key": apiKey(), accept: "application/json" },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Neynar ${path} failed (${res.status}): ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export type FarcasterUser = {
  fid: number;
  username: string;
  display_name?: string;
  custody_address: string;
  verified_addresses?: { eth_addresses?: string[]; sol_addresses?: string[] };
  viewer_context?: { following: boolean; followed_by: boolean };
};

export type FarcasterCast = {
  hash: string;
  author: FarcasterUser;
  text: string;
  viewer_context?: { liked: boolean; recasted: boolean };
};

/** Resolve a cast from a Warpcast/Base App URL (or a 0x hash). */
export async function resolveCast(castUrlOrHash: string): Promise<FarcasterCast> {
  const type = castUrlOrHash.startsWith("0x") ? "hash" : "url";
  if (type === "url") {
    const host = new URL(castUrlOrHash).host.toLowerCase();
    const allowed = ["warpcast.com", "www.warpcast.com", "farcaster.xyz", "www.farcaster.xyz", "base.app", "www.base.app"];
    if (!allowed.includes(host)) throw new Error("Cast URL must be a warpcast.com / farcaster.xyz / base.app link");
  }
  const json = await neynar<{ cast: FarcasterCast }>("/cast", {
    identifier: castUrlOrHash,
    type,
  });
  if (!json.cast?.hash) throw new Error("Cast not found");
  return json.cast;
}

/** Fetch a cast with the entrant as viewer — viewer_context tells us liked/recasted. */
export async function getCastForViewer(castHash: string, viewerFid: number): Promise<FarcasterCast> {
  const json = await neynar<{ cast: FarcasterCast }>("/cast", {
    identifier: castHash,
    type: "hash",
    viewer_fid: String(viewerFid),
  });
  if (!json.cast?.hash) throw new Error("Cast not found");
  return json.cast;
}

/** Fetch users by fid; with viewer_fid set, viewer_context.following = does viewer follow them. */
export async function getUser(fid: number, viewerFid?: number): Promise<FarcasterUser> {
  const params: Record<string, string> = { fids: String(fid) };
  if (viewerFid) params.viewer_fid = String(viewerFid);
  const json = await neynar<{ users: FarcasterUser[] }>("/user/bulk", params);
  const user = json.users?.[0];
  if (!user) throw new Error(`Farcaster user ${fid} not found`);
  return user;
}

/** First verified Solana address on the user's profile, if any. */
export function verifiedSolanaAddress(user: FarcasterUser): string | null {
  return user.verified_addresses?.sol_addresses?.[0] ?? null;
}

export type FarcasterActionCheck =
  | { type: "like"; castHash: string }
  | { type: "repost"; castHash: string }
  | { type: "follow"; targetFid: number };

/** Verify a single action for an entrant fid. Returns pass/fail + proof detail. */
export async function verifyAction(
  check: FarcasterActionCheck,
  entrantFid: number,
): Promise<{ passed: boolean; proof: Record<string, unknown> }> {
  if (check.type === "like" || check.type === "repost") {
    const cast = await getCastForViewer(check.castHash, entrantFid);
    const passed =
      check.type === "like"
        ? cast.viewer_context?.liked === true
        : cast.viewer_context?.recasted === true;
    return {
      passed,
      proof: { method: "neynar.viewer_context", cast: cast.hash, fid: entrantFid, at: new Date().toISOString() },
    };
  }
  const target = await getUser(check.targetFid, entrantFid);
  return {
    passed: target.viewer_context?.following === true,
    proof: { method: "neynar.viewer_context", target_fid: check.targetFid, fid: entrantFid, at: new Date().toISOString() },
  };
}
