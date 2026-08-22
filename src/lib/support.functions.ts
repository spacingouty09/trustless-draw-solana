import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

// Networks match Phantom's own "Receive → Change Network" list exactly
// (see src/routes/support.tsx for the UI-side list/order).
const WALLET_NETWORK_KEYS = [
  "SOLANA",
  "ETHEREUM",
  "BITCOIN_TAPROOT",
  "BITCOIN_NATIVE_SEGWIT",
  "ROBINHOOD_CHAIN",
  "MONAD",
  "BASE",
  "SUI",
  "POLYGON",
  "HYPEREVM",
] as const;

export type WalletAddresses = Record<(typeof WALLET_NETWORK_KEYS)[number], string>;

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

// Addresses live in the wallet_addresses table (publicly readable, RLS-gated
// to SELECT only). A .walletaddress file was tried first, but Vercel's
// serverless file tracer doesn't reliably bundle files unless they're
// referenced via a statically-analyzable literal path — confirmed empirically
// (two preview deploys, ENOENT both times, even after checking process.cwd()
// directly). This table matches every other piece of dynamic data in the app
// and is editable via the Supabase dashboard's table editor, no SQL needed.
export const getWalletAddresses = createServerFn({ method: "GET" }).handler(
  async (): Promise<WalletAddresses> => {
    const empty = Object.fromEntries(
      WALLET_NETWORK_KEYS.map((k) => [k, ""]),
    ) as WalletAddresses;
    const supabase = publicClient();
    const { data, error } = await supabase.from("wallet_addresses").select("network, address");
    if (error) {
      console.error("[getWalletAddresses] query failed:", error);
      return empty;
    }
    const result = { ...empty };
    for (const row of data ?? []) {
      if ((WALLET_NETWORK_KEYS as readonly string[]).includes(row.network)) {
        (result as Record<string, string>)[row.network] = row.address;
      }
    }
    return result;
  },
);

export const subscribeEmail = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ email: z.string().email() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("interest_signups").insert({ email: data.email });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

const suggestionSchema = z.object({
  message: z.string().min(10).max(2000),
  contact_email: z.string().email().optional().or(z.literal("")),
  // Honeypot: hidden field real users never fill; bots often do.
  website: z.string().optional(),
});

export const submitSuggestion = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => suggestionSchema.parse(d))
  .handler(async ({ data }) => {
    if (data.website) {
      // Silently accept — don't tip off the bot that it was caught.
      return { ok: true as const };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("product_suggestions").insert({
      message: data.message,
      contact_email: data.contact_email || null,
    });
    if (error) throw new Error(error.message);
    // TODO(resend): email this to spacingout@y09.space once a Resend API
    // key + verified y09.space sending domain are set up. Until then the
    // database row above is the durable record — see appidea.md roadmap.
    return { ok: true as const };
  });
