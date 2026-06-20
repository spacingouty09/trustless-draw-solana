import { explorerTx, shortAddr } from "@/lib/solana";
import type { Tables } from "@/integrations/supabase/types";

type Entry = Pick<Tables<"entries">, "id" | "handle" | "wallet" | "index">;
type Winner = Pick<Tables<"winners">, "id" | "entry_id" | "share" | "payout_tx">;

export function WinnersPanel({
  event,
  entries,
  winners,
}: {
  event: Tables<"events">;
  entries: Entry[];
  winners: Winner[];
}) {
  const byEntry = new Map(entries.map((e) => [e.id, e]));
  return (
    <div className="rounded-2xl border border-accent/40 bg-card/60 p-6 glow-accent">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-accent">Winners</h3>
        {event.draw_seed && (
          <span className="font-mono text-[10px] text-muted-foreground">seed {event.draw_seed.slice(0, 10)}…</span>
        )}
      </div>
      <ul className="mt-4 divide-y divide-border/60">
        {winners.map((w) => {
          const entry = byEntry.get(w.entry_id);
          return (
            <li key={w.id} className="flex items-center justify-between py-3 text-sm">
              <div>
                <div className="font-medium">@{entry?.handle ?? "—"}</div>
                <div className="font-mono text-xs text-muted-foreground">{shortAddr(entry?.wallet ?? "")}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm">
                  {Number(w.share).toLocaleString()} {event.prize_token}
                </span>
                {w.payout_tx ? (
                  <a
                    href={explorerTx(w.payout_tx)}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-primary/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary hover:bg-primary/10"
                  >
                    Paid ↗
                  </a>
                ) : (
                  <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    Pending
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}