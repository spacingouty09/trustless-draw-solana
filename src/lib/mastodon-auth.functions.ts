import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader, getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

export const startMastodonLogin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ event_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const {
      ensureOauthApp,
      signPayload,
      buildCookie,
      COOKIE_NAMES,
      TTL,
    } = await import("./mastodon-auth.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: ev, error } = await supabaseAdmin
      .from("events")
      .select("id, mastodon_instance")
      .eq("id", data.event_id)
      .maybeSingle();
    if (error || !ev) throw new Error("Event not found");

    const req = getRequest();
    const reqUrl = new URL(req.url);
    const redirectUri = `${reqUrl.origin}/api/public/mastodon/callback`;
    const secure = reqUrl.protocol === "https:";

    const app = await ensureOauthApp(ev.mastodon_instance, redirectUri);

    const nonce = crypto.randomUUID();
    const state = await signPayload(
      { event_id: ev.id, instance: ev.mastodon_instance, nonce, redirect_uri: redirectUri },
      TTL.state,
    );
    setResponseHeader(
      "Set-Cookie",
      buildCookie(COOKIE_NAMES.state, state, { maxAge: TTL.state, secure }),
    );

    const authorizeUrl = new URL(`https://${ev.mastodon_instance}/oauth/authorize`);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("client_id", app.client_id);
    authorizeUrl.searchParams.set("redirect_uri", redirectUri);
    authorizeUrl.searchParams.set("scope", "read:accounts");
    authorizeUrl.searchParams.set("state", state);

    return { authorize_url: authorizeUrl.toString() };
  });

export const getMastodonSession = createServerFn({ method: "GET" }).handler(async () => {
  const { parseCookies, verifyPayload, COOKIE_NAMES } = await import("./mastodon-auth.server");
  const cookies = parseCookies(getRequestHeader("cookie"));
  const token = cookies[COOKIE_NAMES.session];
  if (!token) return null;
  const session = await verifyPayload<{
    handle: string;
    instance: string;
    username: string;
  }>(token);
  if (!session) return null;
  return { handle: session.handle, instance: session.instance, username: session.username };
});

export const signOutMastodon = createServerFn({ method: "POST" }).handler(async () => {
  const { clearCookie, COOKIE_NAMES } = await import("./mastodon-auth.server");
  const req = getRequest();
  const secure = new URL(req.url).protocol === "https:";
  setResponseHeader("Set-Cookie", clearCookie(COOKIE_NAMES.session, secure));
  return { ok: true };
});
