import { Link } from "@tanstack/react-router";
import { Countdown } from "./countdown";
import type { Tables } from "@/integrations/supabase/types";

export function EventCard({
  event,
  entryCount = 0,
}: {
  event: Tables<"events">;
  entryCount?: number;
}) {
  const statusMap: Record<string, { label: string; class: string }> = {
    draft: { label: "Draft", class: "border-muted-foreground/40 text-muted-foreground" },
    open: { label: "Open", class: "border-primary/60 text-primary" },
    settled: { label: "Settled", class: "border-accent/60 text-accent" },
  };
  const s = statusMap[event.status] ?? statusMap.draft;
  return (
    <Link
      to="/event/$id"
      params={{ id: event.id }}
      className="group relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-border/70 bg-card/60 p-6 transition-all hover:border-primary/50 hover:bg-card hover:shadow-[0_0_50px_-12px_oklch(0.78_0.19_162/40%)]"
    >
      <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="flex items-center justify-between">
        <span
          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${s.class}`}
        >
          {s.label}
        </span>
        <span className="text-xs text-muted-foreground">@{event.mastodon_account_acct}</span>
      </div>
      <h3 className="text-lg font-semibold tracking-tight">{event.title}</h3>
      <div className="grid grid-cols-3 gap-2 text-sm">
        <Stat
          label="Prize"
          value={`${Number(event.prize_total).toLocaleString()} ${event.prize_token}`}
        />
        <Stat label="Winners" value={String(event.num_winners)} />
        <Stat label="Entries" value={String(entryCount)} />
      </div>
      <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs">
        <span className="text-muted-foreground">Closes in</span>
        <Countdown to={event.cutoff_ts} />
      </div>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-secondary/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate font-medium">{value}</div>
    </div>
  );
}
