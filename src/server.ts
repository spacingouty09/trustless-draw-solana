import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(
  response: Response,
  url: URL,
): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  const captured = consumeLastCapturedError();
  console.error(captured ?? new Error(`h3 swallowed SSR error: ${body}`));
  const debug = url.searchParams.has("__ssr_debug");
  const debugComment = debug ? buildDebugComment(captured, body) : "";
  return new Response(renderErrorPage() + debugComment, {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function buildDebugComment(captured: unknown, body: string): string {
  const e = captured as { message?: string; stack?: string } | undefined;
  const message = e?.message ?? body;
  const firstStack = (e?.stack ?? "").split("\n").slice(0, 4).join(" | ");
  const safe = `${message} :: ${firstStack}`.replace(/-->/g, "--&gt;");
  return `\n<!-- ssr-error: ${safe} -->\n`;
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response, new URL(request.url));
    } catch (error) {
      console.error(error);
      const url = new URL(request.url);
      const debug = url.searchParams.has("__ssr_debug")
        ? buildDebugComment(error, "")
        : "";
      return new Response(renderErrorPage() + debug, {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
