import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

const schema = z.object({
  event_id: z.string().uuid(),
  wallet: z.string().min(32).max(64),
});

async function sha256Hex(input: string) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input.toLowerCase()),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const joinEvent = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const m = await import("./mastodon.server");
    const { parseCookies, verifyPayload, COOKIE_NAMES } = await import("./mastodon-auth.server");

    // Identity comes from the signed Mastodon session cookie — never trust a
    // client-supplied handle.
    const cookies = parseCookies(getRequestHeader("cookie"));
    const sessionToken = cookies[COOKIE_NAMES.session];
    const session = sessionToken
      ? await verifyPayload<{ handle: string; instance: string; username: string }>(sessionToken)
      : null;
    if (!session) {
      return {
        ok: false as const,
        retry: false as const,
        missing: [] as string[],
        message: "Please sign in with Mastodon to enter.",
      };
    }

    const { data: ev, error } = await supabaseAdmin
      .from("events")
      .select("*")
      .eq("id", data.event_id)
      .maybeSingle();
    if (error || !ev) throw new Error(error?.message ?? "Event not found");
    if (ev.status !== "open") throw new Error("Event is not open for entries");
    if (new Date(ev.cutoff_ts).getTime() < Date.now())
      throw new Error("Entry window has closed");

    if (session.instance.toLowerCase() !== ev.mastodon_instance.toLowerCase()) {
      return {
        ok: false as const,
        retry: false as const,
        missing: [] as string[],
        message: `Please sign in on ${ev.mastodon_instance} to enter this giveaway.`,
      };
    }
    const handle = session.handle.trim().replace(/^@/, "");
    const handleHash = await sha256Hex(handle);

    // duplicate check (DB also enforces unique constraint)
    const { data: existing } = await supabaseAdmin
      .from("entries")
      .select("id")
      .eq("event_id", data.event_id)
      .eq("handle_hash", handleHash)
      .maybeSingle();
    if (existing) throw new Error("This Mastodon handle already entered");

    // Run the required Mastodon checks
    const failures: string[] = [];
    if (ev.require_favourite) {
      const favs = await m.getFavourited(ev.mastodon_instance, ev.mastodon_status_id);
      if (!favs.some((a) => m.matchesHandle(handle, a, ev.mastodon_instance)))
        failures.push("Favourite the post");
    }
    if (ev.require_boost) {
      const boosts = await m.getReblogged(ev.mastodon_instance, ev.mastodon_status_id);
      const foundBoost = boosts.some((a) => m.matchesHandle(handle, a, ev.mastodon_instance));
      const foundTimelineBoost = foundBoost
        ? true
        : await m.hasBoostedStatus(
            ev.mastodon_instance,
            ev.mastodon_status_id,
            ev.mastodon_status_url,
            handle,
          );
      if (!foundTimelineBoost)
        failures.push("Boost the post");
    }
    if (ev.require_follow && ev.mastodon_account_id) {
      const followers = await m.getFollowers(
        ev.mastodon_instance,
        ev.mastodon_account_id,
      );
      if (!followers.some((a) => m.matchesHandle(handle, a, ev.mastodon_instance)))
        failures.push(`Follow @${ev.mastodon_account_acct}`);
    }

    if (failures.length > 0) {
      await supabaseAdmin.from("verification_log").insert({
        event_id: data.event_id,
        handle,
        result: "failed",
        detail: { missing: failures },
      });
      return {
        ok: false as const,
        retry: true as const,
        missing: failures,
        message: `Couldn't verify yet — missing: ${failures.join(", ")}. Federation can lag a few seconds; try again shortly.`,
      };
    }

    // Get next index
    const { count } = await supabaseAdmin
      .from("entries")
      .select("*", { count: "exact", head: true })
      .eq("event_id", data.event_id);
    const nextIndex = count ?? 0;

    const { data: row, error: insErr } = await supabaseAdmin
      .from("entries")
      .insert({
        event_id: data.event_id,
        handle,
        handle_hash: handleHash,
        wallet: data.wallet,
        index: nextIndex,
      })
      .select("*")
      .single();
    if (insErr) throw new Error(insErr.message);

    await supabaseAdmin.from("verification_log").insert({
      event_id: data.event_id,
      handle,
      result: "passed",
      detail: { index: nextIndex },
    });

    return { ok: true as const, entry: row };
  });