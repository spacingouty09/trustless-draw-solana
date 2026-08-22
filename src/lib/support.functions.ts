import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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

function parseDotenvLines(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

// .walletaddress ships committed (addresses are public, unlike .env secrets)
// but empty — the organizer fills it in and redeploys. Read via
// import.meta.url so Vercel's Node File Trace bundles the file into the
// serverless function output (verified against the actual build output).
export const getWalletAddresses = createServerFn({ method: "GET" }).handler(
  async (): Promise<WalletAddresses> => {
    const empty = Object.fromEntries(
      WALLET_NETWORK_KEYS.map((k) => [k, ""]),
    ) as WalletAddresses;
    try {
      const { readFileSync } = await import("node:fs");
      const { fileURLToPath } = await import("node:url");
      const path = fileURLToPath(new URL("../../.walletaddress", import.meta.url));
      const text = readFileSync(path, "utf8");
      const parsed = parseDotenvLines(text);
      return { ...empty, ...parsed };
    } catch (err) {
      console.error("[getWalletAddresses] could not read .walletaddress:", err);
      return empty;
    }
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
