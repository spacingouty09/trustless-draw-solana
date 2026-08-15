import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const authSchema = z.object({
  pubkey: z.string().min(32),
  signature: z.string().min(40),
  issued_at: z.string(),
});

const createSchema = z.object({
  organizer_pubkey: z.string().min(32),
  title: z.string().min(2).max(140),
  description: z.string().max(500).default(""),
  mastodon_status_url: z.string().url(),
  require_favourite: z.boolean(),
  require_boost: z.boolean(),
  require_follow: z.boolean(),
  prize_token: z.string().default("USDC"),
  prize_total: z.number().positive(),
  num_winners: z.number().int().positive().max(50),
  cutoff_ts: z.string(), // ISO
});

export const createEvent = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => createSchema.parse(d))
  .handler(async ({ data }) => {
    const { resolveStatus } = await import("./mastodon.server");
    const status = await resolveStatus(data.mastodon_status_url);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("events")
      .insert({
        organizer_pubkey: data.organizer_pubkey,
        title: data.title,
        description: data.description ?? "",
        mastodon_status_url: data.mastodon_status_url,
        mastodon_instance: status.instance,
        mastodon_status_id: status.id,
        mastodon_account_acct: status.account.acct,
        mastodon_account_id: status.account.id,
        require_favourite: data.require_favourite,
        require_boost: data.require_boost,
        require_follow: data.require_follow,
        prize_token: data.prize_token,
        prize_total: data.prize_total,
        num_winners: data.num_winners,
        cutoff_ts: data.cutoff_ts,
        status: "draft",
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const commitPool = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        commit_tx: z.string().min(10),
        delegation_pda: z.string().min(10),
        auth: authSchema,
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { verifyWalletSignature } = await import("./wallet-auth.server");
    // Load the event first so we can check ownership against organizer_pubkey.
    const { data: ev, error: evErr } = await supabaseAdmin
      .from("events")
      .select("organizer_pubkey, status")
      .eq("id", data.id)
      .maybeSingle();
    if (evErr) throw new Error(evErr.message);
    if (!ev) throw new Error("Event not found");
    if (ev.organizer_pubkey !== data.auth.pubkey)
      throw new Error("Only the event organizer can commit the pool");
    const v = verifyWalletSignature({
      pubkey: data.auth.pubkey,
      signature: data.auth.signature,
      action: "commit",
      eventId: data.id,
      issuedAt: data.auth.issued_at,
    });
    if (!v.ok) throw new Error(v.reason);

    const { data: row, error } = await supabaseAdmin
      .from("events")
      .update({
        commit_tx: data.commit_tx,
        delegation_pda: data.delegation_pda,
        status: "open",
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const drawAndPay = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), auth: authSchema }).parse(d))
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { verifyWalletSignature } = await import("./wallet-auth.server");
      // load event + entries
      const { data: ev, error: evErr } = await supabaseAdmin
        .from("events")
        .select("*")
        .eq("id", data.id)
        .maybeSingle();
      if (evErr) {
        console.error("[drawAndPay] event fetch error:", evErr);
        return { ok: false as const, message: `Couldn't load event: ${evErr.message}` };
      }
      if (!ev) return { ok: false as const, message: "Event not found" };
      if (ev.organizer_pubkey !== data.auth.pubkey)
        return { ok: false as const, message: "Only the organizer can draw" };
      const v = verifyWalletSignature({
        pubkey: data.auth.pubkey,
        signature: data.auth.signature,
        action: "draw",
        eventId: data.id,
        issuedAt: data.auth.issued_at,
      });
      if (!v.ok) return { ok: false as const, message: v.reason };
      if (ev.status === "settled") return { ok: false as const, message: "Already settled" };

      const { data: entries, error: entErr } = await supabaseAdmin
        .from("entries")
        .select("id, index")
        .eq("event_id", data.id)
        .order("index");
      if (entErr) {
        console.error("[drawAndPay] entries fetch error:", entErr);
        return { ok: false as const, message: `Couldn't load entries: ${entErr.message}` };
      }
      if (!entries || entries.length === 0)
        return { ok: false as const, message: "No entries to draw" };

      const numWinners = Math.min(ev.num_winners, entries.length);

      // demo-grade seed (slot-hash analogue) — replace with VRF in prod
      const seed = crypto.getRandomValues(new Uint8Array(32));
      const seedHex = Array.from(seed)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      // deterministic shuffle using seed
      const indices = entries.map((_, i) => i);
      let s = 0;
      for (let i = 0; i < 32; i++) s = (s * 31 + seed[i]) >>> 0;
      for (let i = indices.length - 1; i > 0; i--) {
        s = (1103515245 * s + 12345) >>> 0;
        const j = s % (i + 1);
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      const winningEntryIds = indices.slice(0, numWinners).map((i) => entries[i].id);

      // Round share to 6 decimals to stay friendly to downstream displays / numeric columns.
      const rawShare = Number(ev.prize_total) / numWinners;
      const share = Math.round(rawShare * 1e6) / 1e6;

      const winnerRows = winningEntryIds.map((entry_id) => ({
        event_id: data.id,
        entry_id,
        share,
      }));
      const { error: insErr } = await supabaseAdmin.from("winners").insert(winnerRows);
      if (insErr) {
        console.error("[drawAndPay] winners insert error:", insErr, winnerRows);
        return { ok: false as const, message: `Couldn't record winners: ${insErr.message}` };
      }

      const { error: upErr } = await supabaseAdmin
        .from("events")
        .update({
          status: "settled",
          draw_seed: seedHex,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id);
      if (upErr) {
        console.error("[drawAndPay] event update error:", upErr);
        return { ok: false as const, message: `Couldn't finalize event: ${upErr.message}` };
      }

      return { ok: true as const, seedHex, numWinners };
    } catch (err) {
      console.error("[drawAndPay] unexpected error:", err);
      const message = err instanceof Error ? err.message : "Unexpected error drawing winners";
      return { ok: false as const, message };
    }
  });

export const recordPayout = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({ winner_id: z.string().uuid(), payout_tx: z.string().min(10), auth: authSchema })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { verifyWalletSignature } = await import("./wallet-auth.server");
    // Look up the winner's event to verify the caller is the organizer.
    const { data: winner, error: wErr } = await supabaseAdmin
      .from("winners")
      .select("id, event_id, events!inner(organizer_pubkey)")
      .eq("id", data.winner_id)
      .maybeSingle();
    if (wErr) throw new Error(wErr.message);
    if (!winner) throw new Error("Winner not found");
    const organizerPubkey = (winner as unknown as { events: { organizer_pubkey: string } }).events
      .organizer_pubkey;
    if (organizerPubkey !== data.auth.pubkey)
      throw new Error("Only the event organizer can record payouts");
    const v = verifyWalletSignature({
      pubkey: data.auth.pubkey,
      signature: data.auth.signature,
      action: "payout",
      eventId: (winner as unknown as { event_id: string }).event_id,
      issuedAt: data.auth.issued_at,
    });
    if (!v.ok) throw new Error(v.reason);

    const { error } = await supabaseAdmin
      .from("winners")
      .update({ payout_tx: data.payout_tx })
      .eq("id", data.winner_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
