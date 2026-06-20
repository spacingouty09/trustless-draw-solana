import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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
  .inputValidator((d: unknown) =>
    z
      .object({ id: z.string().uuid(), organizer_pubkey: z.string().min(32) })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // load event + entries
    const { data: ev, error: evErr } = await supabaseAdmin
      .from("events")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (evErr || !ev) throw new Error(evErr?.message ?? "Event not found");
    if (ev.organizer_pubkey !== data.organizer_pubkey)
      throw new Error("Only the organizer can draw");
    if (ev.status === "settled") throw new Error("Already settled");

    const { data: entries, error: entErr } = await supabaseAdmin
      .from("entries")
      .select("id, index")
      .eq("event_id", data.id)
      .order("index");
    if (entErr) throw new Error(entErr.message);
    if (!entries || entries.length === 0) throw new Error("No entries to draw");

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

    const share = Number(ev.prize_total) / numWinners;

    const winnerRows = winningEntryIds.map((entry_id) => ({
      event_id: data.id,
      entry_id,
      share,
    }));
    const { error: insErr } = await supabaseAdmin.from("winners").insert(winnerRows);
    if (insErr) throw new Error(insErr.message);

    const { error: upErr } = await supabaseAdmin
      .from("events")
      .update({
        status: "settled",
        draw_seed: seedHex,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (upErr) throw new Error(upErr.message);

    return { seedHex, numWinners };
  });

export const recordPayout = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({ winner_id: z.string().uuid(), payout_tx: z.string().min(10) })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("winners")
      .update({ payout_tx: data.payout_tx })
      .eq("id", data.winner_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });