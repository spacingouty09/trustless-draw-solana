import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/mastodon/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const stateParam = url.searchParams.get("state");
        const error = url.searchParams.get("error");
        const secure = url.protocol === "https:";

        const {
          parseCookies,
          verifyPayload,
          signPayload,
          buildCookie,
          clearCookie,
          ensureOauthApp,
          exchangeCodeForToken,
          verifyCredentials,
          COOKIE_NAMES,
          TTL,
        } = await import("@/lib/mastodon-auth.server");

        const fail = (msg: string) => {
          const html = `<!doctype html><meta charset=utf-8><title>Sign-in failed</title>
<body style="font-family:system-ui;background:#0b0b10;color:#fafafa;padding:48px;text-align:center">
<h1 style="font-size:18px;margin:0 0 12px">Mastodon sign-in failed</h1>
<p style="opacity:.7;font-size:14px">${msg.replace(/[<>&]/g, "")}</p>
<p style="margin-top:24px"><a style="color:#7dd3fc" href="/">Back to giveaways</a></p>
</body>`;
          return new Response(html, { status: 400, headers: { "content-type": "text/html; charset=utf-8" } });
        };

        if (error) return fail(`Mastodon returned: ${error}`);
        if (!code || !stateParam) return fail("Missing code or state.");

        const cookies = parseCookies(request.headers.get("cookie"));
        const stateCookie = cookies[COOKIE_NAMES.state];
        if (!stateCookie || stateCookie !== stateParam) return fail("State mismatch — please try signing in again.");

        const state = await verifyPayload<{
          event_id: string;
          instance: string;
          nonce: string;
          redirect_uri: string;
        }>(stateParam);
        if (!state) return fail("Sign-in request expired. Please try again.");

        try {
          const app = await ensureOauthApp(state.instance, state.redirect_uri);
          const token = await exchangeCodeForToken({
            instance: state.instance,
            clientId: app.client_id,
            clientSecret: app.client_secret,
            code,
            redirectUri: state.redirect_uri,
          });
          const me = await verifyCredentials(state.instance, token);
          const handle = `${me.username}@${state.instance}`;

          const session = await signPayload(
            { handle, instance: state.instance, username: me.username },
            TTL.session,
          );

          const headers = new Headers({ Location: `/event/${state.event_id}` });
          headers.append("Set-Cookie", buildCookie(COOKIE_NAMES.session, session, { maxAge: TTL.session, secure }));
          headers.append("Set-Cookie", clearCookie(COOKIE_NAMES.state, secure));
          return new Response(null, { status: 302, headers });
        } catch (e) {
          console.error("[mastodon callback]", e);
          return fail(e instanceof Error ? e.message : "Sign-in failed.");
        }
      },
    },
  },
});
