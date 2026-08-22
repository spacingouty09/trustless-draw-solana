import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  event_id: z.string().uuid(),
  // Optional: when every required platform provides a verified payout address
  // (e.g. Farcaster verified Solana address), the wallet field can be omitted.
  wallet: z.string().min(32).max(64).optional(),
});

async function sha256Hex(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input.toLowerCase()));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type ActionRow = {
  id: string;
  platform: string;
  action_type: string;
  target_url: string | null;
  target_ref: Record<string, unknown>;
  label: string;
  required: boolean;
  sort: number;
};

// Actions-driven entry verification. Each required action is checked through
// its platform adapter using the identity from that platform's signed session
// cookie; completions are recorded per action, and the entry links every
// identity involved.
export const joinEvent = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data }) => {
    const { getRequestHeader } = await import("@tanstack/react-start/server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { parseCookies, verifyPayload, COOKIE_NAMES } = await import("./mastodon-auth.server");
    const { readFarcasterSession } = await import("./farcaster-auth.server");

    const cookieHeader = getRequestHeader("cookie");

    const { data: ev, error } = await supabaseAdmin
      .from("events")
      .select("*")
      .eq("id", data.event_id)
      .maybeSingle();
    if (error || !ev) throw new Error(error?.message ?? "Event not found");
    if (ev.status !== "open") throw new Error("Event is not open for entries");
    if (new Date(ev.cutoff_ts).getTime() < Date.now()) throw new Error("Entry window has closed");

    const { data: actionRows, error: actErr } = await supabaseAdmin
      .from("campaign_actions")
      .select("id, platform, action_type, target_url, target_ref, label, required, sort")
      .eq("event_id", data.event_id)
      .order("sort");
    if (actErr) throw new Error(actErr.message);
    const actions = (actionRows ?? []) as ActionRow[];
    const requiredActions = actions.filter((a) => a.required);
    if (requiredActions.length === 0) throw new Error("This event has no entry actions configured");

    const platforms = [...new Set(requiredActions.map((a) => a.platform))];

    // ── Collect per-platform identities from signed session cookies ──
    const cookies = parseCookies(cookieHeader);
    const identities: Record<string, string> = {};
    let mastodonSession: { handle: string; instance: string; username: string } | null = null;
    let farcasterSession: { fid: number; username: string; sol_address: string | null } | null =
      null;

    if (platforms.includes("mastodon")) {
      const token = cookies[COOKIE_NAMES.session];
      mastodonSession = token
        ? await verifyPayload<{ handle: string; instance: string; username: string }>(token)
        : null;
      if (!mastodonSession) {
        return {
          ok: false as const,
          retry: false as const,
          missing: ["Sign in with Mastodon"],
          message: "Please sign in with Mastodon to enter.",
        };
      }
      const mastodonActions = requiredActions.filter((a) => a.platform === "mastodon");
      const instanceMismatch = mastodonActions.find(
        (a) =>
          String(a.target_ref.instance ?? "").toLowerCase() !==
          mastodonSession!.instance.toLowerCase(),
      );
      if (instanceMismatch) {
        return {
          ok: false as const,
          retry: false as const,
          missing: [] as string[],
          message: `Please sign in on ${String(instanceMismatch.target_ref.instance)} to enter this giveaway.`,
        };
      }
      identities.mastodon = `mastodon:${mastodonSession.handle.trim().replace(/^@/, "")}`;
    }

    if (platforms.includes("farcaster")) {
      farcasterSession = await readFarcasterSession(cookieHeader);
      if (!farcasterSession) {
        return {
          ok: false as const,
          retry: false as const,
          missing: ["Sign in with Farcaster"],
          message: "Please sign in with Farcaster to enter.",
        };
      }
      identities.farcaster = `farcaster:${farcasterSession.fid}`;
    }

    // ── Payout wallet: explicit input wins; Farcaster verified address fills in ──
    const wallet = data.wallet?.trim() || farcasterSession?.sol_address || null;
    if (!wallet) {
      return {
        ok: false as const,
        retry: false as const,
        missing: ["Add a Solana wallet"],
        message:
          "No payout wallet: enter a Solana address (or verify one on your Farcaster profile).",
      };
    }

    // ── Duplicate check: any identity that already completed an action here ──
    const identityValues = Object.values(identities);
    const { data: prior } = await supabaseAdmin
      .from("action_completions")
      .select("id, platform_identity")
      .eq("event_id", data.event_id)
      .in("platform_identity", identityValues)
      .limit(1);
    if (prior && prior.length > 0) {
      throw new Error("One of these accounts already entered this giveaway");
    }

    // ── Verify every required action through its platform adapter ──
    const failures: string[] = [];
    const passes: { action: ActionRow; identity: string; proof: Record<string, unknown> }[] = [];

    for (const action of requiredActions) {
      if (action.platform === "mastodon") {
        const m = await import("./mastodon.server");
        const handle = mastodonSession!.handle.trim().replace(/^@/, "");
        const instance = String(action.target_ref.instance ?? "");
        const statusId = String(action.target_ref.status_id ?? "");
        let passed = false;
        if (action.action_type === "like") {
          const favs = await m.getFavourited(instance, statusId);
          passed = favs.some((a) => m.matchesHandle(handle, a, instance));
        } else if (action.action_type === "repost") {
          const boosts = await m.getReblogged(instance, statusId);
          passed = boosts.some((a) => m.matchesHandle(handle, a, instance));
          if (!passed) {
            passed = await m.hasBoostedStatus(
              instance,
              statusId,
              String(action.target_ref.status_url ?? action.target_url ?? ""),
              handle,
            );
          }
        } else if (action.action_type === "follow") {
          const accountId = action.target_ref.account_id
            ? String(action.target_ref.account_id)
            : null;
          if (accountId) {
            const followers = await m.getFollowers(instance, accountId);
            passed = followers.some((a) => m.matchesHandle(handle, a, instance));
          }
        }
        if (passed) {
          passes.push({
            action,
            identity: identities.mastodon,
            proof: { method: "mastodon.public_api", at: new Date().toISOString() },
          });
        } else {
          failures.push(action.label || `${action.action_type} on Mastodon`);
        }
      } else if (action.platform === "farcaster") {
        const fc = await import("./farcaster.server");
        const fid = farcasterSession!.fid;
        let result: { passed: boolean; proof: Record<string, unknown> } | null = null;
        if (action.action_type === "like" || action.action_type === "repost") {
          result = await fc.verifyAction(
            { type: action.action_type, castHash: String(action.target_ref.cast_hash ?? "") },
            fid,
          );
        } else if (action.action_type === "follow") {
          result = await fc.verifyAction(
            { type: "follow", targetFid: Number(action.target_ref.target_fid ?? 0) },
            fid,
          );
        }
        if (result?.passed) {
          passes.push({ action, identity: identities.farcaster, proof: result.proof });
        } else {
          failures.push(action.label || `${action.action_type} on Farcaster`);
        }
      } else {
        failures.push(`${action.platform} verification not yet supported`);
      }
    }

    const identityList = Object.values(identities);
    const displayHandle =
      mastodonSession?.handle ?? farcasterSession?.username ?? identityList[0] ?? "unknown";

    if (failures.length > 0) {
      await supabaseAdmin.from("verification_log").insert({
        event_id: data.event_id,
        handle: displayHandle,
        result: "failed",
        detail: { missing: failures },
      });
      return {
        ok: false as const,
        retry: true as const,
        missing: failures,
        message: `Couldn't verify yet — missing: ${failures.join(", ")}. Platforms can lag a few seconds; try again shortly.`,
      };
    }

    // ── Record entry + per-action completions ──
    const handleHash = await sha256Hex(identityList.sort().join("|"));

    const { count } = await supabaseAdmin
      .from("entries")
      .select("*", { count: "exact", head: true })
      .eq("event_id", data.event_id);
    const nextIndex = count ?? 0;

    const { data: row, error: insErr } = await supabaseAdmin
      .from("entries")
      .insert({
        event_id: data.event_id,
        handle: displayHandle,
        handle_hash: handleHash,
        identities,
        wallet,
        index: nextIndex,
      })
      .select("*")
      .single();
    if (insErr) {
      if (insErr.code === "23505") throw new Error("This account already entered");
      throw new Error(insErr.message);
    }

    const { error: compErr } = await supabaseAdmin.from("action_completions").insert(
      passes.map((p) => ({
        action_id: p.action.id,
        event_id: data.event_id,
        entry_id: row.id,
        platform_identity: p.identity,
        proof: p.proof as import("@/integrations/supabase/types").Json,
      })),
    );
    if (compErr) {
      // Unique violation here means a race on the same identity — roll the entry back.
      await supabaseAdmin.from("entries").delete().eq("id", row.id);
      if (compErr.code === "23505") throw new Error("This account already entered");
      throw new Error(compErr.message);
    }

    await supabaseAdmin.from("verification_log").insert({
      event_id: data.event_id,
      handle: displayHandle,
      result: "passed",
      detail: { index: nextIndex, identities: identityList },
    });

    return { ok: true as const, entry: row };
  });
