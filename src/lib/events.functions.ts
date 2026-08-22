import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  const url =
    process.env.SUPABASE_URL ||
    (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    (import.meta as { env?: Record<string, string | undefined> }).env
      ?.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase env not configured (SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY)");
  }
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

export const listEvents = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getEvent = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const [eventRes, entriesRes, winnersRes, actionsRes] = await Promise.all([
      supabase.from("events").select("*").eq("id", data.id).maybeSingle(),
      supabase
        .from("entries")
        .select("id, handle, wallet, index, created_at")
        .eq("event_id", data.id)
        .order("index"),
      supabase
        .from("winners")
        .select("id, entry_id, share, payout_tx, created_at")
        .eq("event_id", data.id),
      supabase
        .from("campaign_actions")
        .select("id, platform, action_type, target_url, target_ref, label, required, sort")
        .eq("event_id", data.id)
        .order("sort"),
    ]);
    if (eventRes.error) throw new Error(eventRes.error.message);
    if (!eventRes.data) throw new Error("Event not found");
    return {
      event: eventRes.data,
      entries: entriesRes.data ?? [],
      winners: winnersRes.data ?? [],
      actions: actionsRes.data ?? [],
    };
  });

export const listOrganizerEvents = createServerFn({ method: "GET" })
  .inputValidator((d: { organizer: string }) =>
    z.object({ organizer: z.string().min(32) }).parse(d),
  )
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { data: rows, error } = await supabase
      .from("events")
      .select("*")
      .eq("organizer_pubkey", data.organizer)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
