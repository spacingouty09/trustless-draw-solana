import { createFileRoute } from "@tanstack/react-router";

// Server-side proxy for Solana RPC. Keeps the Helius API key out of the
// client bundle. The client posts standard JSON-RPC bodies to /api/public/solana-rpc
// and we forward them upstream using the SOLANA_RPC secret.
const corsHeaders: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

export const Route = createFileRoute("/api/public/solana-rpc")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        const upstream = process.env.SOLANA_RPC;
        if (!upstream) {
          return new Response(
            JSON.stringify({ error: "SOLANA_RPC not configured" }),
            { status: 500, headers: { "content-type": "application/json", ...corsHeaders } },
          );
        }
        const body = await request.text();
        const res = await fetch(upstream, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body,
        });
        const text = await res.text();
        return new Response(text, {
          status: res.status,
          headers: {
            "content-type": res.headers.get("content-type") ?? "application/json",
            ...corsHeaders,
          },
        });
      },
    },
  },
});