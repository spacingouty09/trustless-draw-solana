import { useEffect, useState } from "react";
import { explorerAddr, explorerTx, getSolBalance, shortAddr } from "@/lib/solana";
import type { Tables } from "@/integrations/supabase/types";

export function PrizePoolPanel({ event }: { event: Tables<"events"> }) {
  const [bal, setBal] = useState<number | null>(null);
  useEffect(() => {
    let cancel = false;
    (async () => {
      const b = await getSolBalance(event.organizer_pubkey);
      if (!cancel) setBal(b);
    })();
    return () => {
      cancel = true;
    };
  }, [event.organizer_pubkey]);

  const total = Number(event.prize_total);
  const share = total / event.num_winners;
  const committed = !!event.commit_tx;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-card to-card/40 p-6">
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-brand opacity-10 blur-3xl" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Prize pool</p>
          <p className="mt-1 font-mono text-4xl font-semibold tracking-tight text-gradient">
            {total.toLocaleString()} <span className="text-2xl">{event.prize_token}</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {event.num_winners} winner{event.num_winners > 1 ? "s" : ""} · {share.toLocaleString()} {event.prize_token} each
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Dot ok={committed} label={committed ? "Committed on-chain" : "Not committed"} />
          <Dot
            ok={bal !== null && bal > 0}
            label={bal === null ? "Checking solvency…" : `Wallet: ${bal.toFixed(3)} SOL`}
          />
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <Field label="Organizer" value={shortAddr(event.organizer_pubkey)} href={explorerAddr(event.organizer_pubkey)} />
        {event.commit_tx && <Field label="Commit tx" value={shortAddr(event.commit_tx)} href={explorerTx(event.commit_tx)} />}
        {event.delegation_pda && <Field label="Delegation PDA" value={shortAddr(event.delegation_pda)} href={explorerAddr(event.delegation_pda)} />}
      </dl>
    </div>
  );
}

function Dot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className={`h-2 w-2 rounded-full ${ok ? "bg-primary shadow-[0_0_8px_oklch(0.78_0.19_162/80%)]" : "bg-destructive"}`} />
      {label}
    </span>
  );
}

function Field({ label, value, href }: { label: string; value: string; href?: string }) {
  const Inner = (
    <>
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-mono text-sm">{value}</dd>
    </>
  );
  return (
    <div className="rounded-lg border border-border/60 bg-secondary/40 px-3 py-2">
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="block hover:text-primary">
          {Inner}
        </a>
      ) : (
        Inner
      )}
    </div>
  );
}