// Server-only Mastodon OAuth helpers: app registration, token exchange,
// and HMAC-signed cookies (state + session).

import { lookupAccount } from "./mastodon.server";
import { PRODUCT_NAME } from "./product";

const SESSION_COOKIE = "md_session";
const STATE_COOKIE = "md_oauth_state";
const SESSION_TTL_SECONDS = 60 * 60; // 1 hour
const STATE_TTL_SECONDS = 60 * 10; // 10 minutes

function getHmacKey(): string {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!k) throw new Error("Server signing key unavailable");
  return k;
}

function b64urlEncode(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str: string): Uint8Array {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const bin = atob(str.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getHmacKey()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return b64urlEncode(new Uint8Array(sig));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function signPayload<T extends object>(
  payload: T,
  ttlSeconds: number,
): Promise<string> {
  const body = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const payloadB64 = b64urlEncode(new TextEncoder().encode(JSON.stringify(body)));
  const sig = await hmac(payloadB64);
  return `${payloadB64}.${sig}`;
}

export async function verifyPayload<T>(token: string): Promise<T | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  const expected = await hmac(payloadB64);
  if (!timingSafeEqual(sig, expected)) return null;
  try {
    const raw = new TextDecoder().decode(b64urlDecode(payloadB64));
    const parsed = JSON.parse(raw) as T & { exp?: number };
    if (typeof parsed.exp === "number" && parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed as T;
  } catch {
    return null;
  }
}

export function parseCookies(header: string | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const pair of header.split(/;\s*/)) {
    const idx = pair.indexOf("=");
    if (idx === -1) continue;
    const k = pair.slice(0, idx).trim();
    const v = pair.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

export function buildCookie(
  name: string,
  value: string,
  opts: { maxAge: number; secure: boolean },
): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${opts.maxAge}`,
  ];
  if (opts.secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearCookie(name: string, secure: boolean): string {
  return buildCookie(name, "", { maxAge: 0, secure });
}

export const COOKIE_NAMES = { session: SESSION_COOKIE, state: STATE_COOKIE };
export const TTL = { session: SESSION_TTL_SECONDS, state: STATE_TTL_SECONDS };

function assertHostShape(instance: string) {
  if (!/^[a-z0-9.-]+$/i.test(instance)) throw new Error("Invalid Mastodon instance");
}

export async function ensureOauthApp(
  instance: string,
  redirectUri: string,
): Promise<{ client_id: string; client_secret: string }> {
  assertHostShape(instance);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: existing } = await supabaseAdmin
    .from("mastodon_oauth_apps")
    .select("client_id, client_secret")
    .eq("instance", instance)
    .eq("redirect_uri", redirectUri)
    .maybeSingle();
  if (existing) return existing;

  const form = new URLSearchParams({
    client_name: PRODUCT_NAME,
    redirect_uris: redirectUri,
    scopes: "read:accounts",
    website: new URL(redirectUri).origin,
  });
  const res = await fetch(`https://${instance}/api/v1/apps`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: form.toString(),
  });
  if (!res.ok) throw new Error(`Mastodon app registration failed (${res.status})`);
  const app = (await res.json()) as { client_id: string; client_secret: string };
  await supabaseAdmin.from("mastodon_oauth_apps").insert({
    instance,
    redirect_uri: redirectUri,
    client_id: app.client_id,
    client_secret: app.client_secret,
  });
  return { client_id: app.client_id, client_secret: app.client_secret };
}

export async function exchangeCodeForToken(args: {
  instance: string;
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}): Promise<string> {
  assertHostShape(args.instance);
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: args.clientId,
    client_secret: args.clientSecret,
    redirect_uri: args.redirectUri,
    code: args.code,
    scope: "read:accounts",
  });
  const res = await fetch(`https://${args.instance}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`Token exchange failed (${res.status})`);
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

export async function verifyCredentials(
  instance: string,
  accessToken: string,
): Promise<{ username: string; acct: string }> {
  assertHostShape(instance);
  const res = await fetch(`https://${instance}/api/v1/accounts/verify_credentials`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`verify_credentials failed (${res.status})`);
  return (await res.json()) as { username: string; acct: string };
}

export { lookupAccount };

export type MastodonSession = {
  handle: string;
  instance: string;
  username: string;
  exp?: number;
};
