import { Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";
import { toast } from "sonner";
import { getEvent } from "@/lib/events.functions";
import { commitPool, drawAndPay, recordPayout } from "@/lib/organizer.functions";
import { PrizePoolPanel } from "@/components/prize-pool-panel";
import { WinnersPanel } from "@/components/winners-panel";
import { Countdown } from "@/components/countdown";
import { sendCommitMemo, sendPayoutMemo, explorerTx, shortAddr } from "@/lib/solana";
import { signWalletAction } from "@/lib/wallet-auth";

export function OrganizerManageClient({ id }: { id: string }) {
  const wallet = useWallet();
  const qc = useQueryClient();
  const evQuery = useQuery({
    queryKey: ["event", id],
    queryFn: () => getEvent({ data: { id } }),
    refetchInterval: 6_000,
  });

  if (evQuery.isLoading) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  if (evQuery.error) return <div className="p-10 text-center text-destructive">{(evQuery.error as Error).message}</div>;
  if (!evQuery.data) return null;

  const { event, entries, winners } = evQuery.data;
  const isOrganizer = wallet.publicKey?.toBase58() === event.organizer_pubkey;
  const canDraw = event.status === "open" && entries.length > 0;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Link to="/organizer" className="text-sm text-muted-foreground hover:text-foreground">
        ← All your events
      </Link>
      <div className="mt-4 flex items-baseline justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">{event.title}</h1>
        <div className="text-right text-xs uppercase tracking-wider text-muted-foreground">
          <div>{event.status}</div>
          <div className="mt-1 text-foreground">
            <Countdown to={event.cutoff_ts} />
          </div>
        </div>
      </div>

      {!isOrganizer && (
        <div className="mt-6 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
          Connect the organizer wallet ({shortAddr(event.organizer_pubkey)}) to manage this event.
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <PrizePoolPanel event={event} />
          <EntriesTable entries={entries} />
          {event.status === "settled" && (
            <WinnersPanel event={event} entries={entries} winners={winners} />
          )}
        </div>
        <div className="space-y-6">
          {event.status === "draft" && isOrganizer && (
            <CommitCard
              eventId={event.id}
              total={Number(event.prize_total)}
              token={event.prize_token}
              onDone={() => qc.invalidateQueries({ queryKey: ["event", id] })}
            />
          )}
          {canDraw && isOrganizer && (
            <DrawCard
              eventId={event.id}
              organizer={event.organizer_pubkey}
              entriesCount={entries.length}
              onDone={() => qc.invalidateQueries({ queryKey: ["event", id] })}
            />
          )}
          {event.status === "settled" && isOrganizer && (
            <PayoutCard
              event={event}
              winners={winners}
              entries={entries}
              onDone={() => qc.invalidateQueries({ queryKey: ["event", id] })}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function CommitCard({
  eventId,
  total,
  token,
  onDone,
}: {
  eventId: string;
  total: number;
  token: string;
  onDone: () => void;
}) {
  const { publicKey, signTransaction, signMessage } = useWallet();
  const commit = useServerFn(commitPool);
  const [loading, setLoading] = useState(false);

  return (
    <div className="rounded-2xl border border-primary/40 bg-card/60 p-6 glow-primary">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">
        Step 1 · Commit the prize pool
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Sign a Solana devnet transaction that publicly locks in the {total.toLocaleString()} {token}{" "}
        commitment. Anyone can verify on Explorer.
      </p>
      <button
        disabled={!publicKey || !signTransaction || !signMessage || loading}
        onClick={async () => {
          if (!publicKey || !signTransaction || !signMessage) return;
          try {
            setLoading(true);
            const sig = await sendCommitMemo({
              payer: publicKey,
              signTransaction,
              campaignId: eventId,
              amount: total,
              token,
            });
            const auth = await signWalletAction({
              signMessage,
              pubkey: publicKey.toBase58(),
              action: "commit",
              eventId,
            });
            await commit({ data: { id: eventId, commit_tx: sig, delegation_pda: sig, auth } });
            toast.success("Prize pool committed on-chain");
            onDone();
          } catch (e) {
            toast.error((e as Error).message);
          } finally {
            setLoading(false);
          }
        }}
        className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-lg bg-gradient-brand font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {loading ? "Signing & confirming…" : "Sign commitment tx"}
      </button>
      <p className="mt-3 text-[10px] text-muted-foreground">
        Demo uses a Solana Memo program tx. Production swaps in <code>createFixedDelegation</code>{" "}
        from the Subscriptions & Allowances program for an actual delegated allowance.
      </p>
    </div>
  );
}

function DrawCard({
  eventId,
  organizer,
  entriesCount,
  onDone,
}: {
  eventId: string;
  organizer: string;
  entriesCount: number;
  onDone: () => void;
}) {
  const { publicKey, signMessage } = useWallet();
  const draw = useServerFn(drawAndPay);
  const m = useMutation({
    mutationFn: async () => {
      if (!publicKey || !signMessage) throw new Error("Connect your wallet first");
      if (publicKey.toBase58() !== organizer)
        throw new Error("Connect the organizer wallet to draw");
      const auth = await signWalletAction({
        signMessage,
        pubkey: publicKey.toBase58(),
        action: "draw",
        eventId,
      });
      return draw({ data: { id: eventId, auth } });
    },
    onSuccess: (r) => {
      if (!r.ok) {
        toast.error(r.message);
        return;
      }
      toast.success(`Drew ${r.numWinners} winner(s). Seed ${r.seedHex.slice(0, 10)}…`);
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="rounded-2xl border border-accent/40 bg-card/60 p-6 glow-accent">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-accent">
        Step 2 · Draw winners
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Pick winners from {entriesCount} verified entries. The seed is recorded on the event for
        anyone to verify.
      </p>
      <button
        onClick={() => m.mutate()}
        disabled={m.isPending || !publicKey || !signMessage}
        className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-lg bg-gradient-brand font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {m.isPending ? "Drawing…" : "Draw winners"}
      </button>
    </div>
  );
}

function PayoutCard({
  event,
  winners,
  entries,
  onDone,
}: {
  event: { id: string; prize_token: string };
  winners: Array<{ id: string; entry_id: string; share: number | string; payout_tx: string | null }>;
  entries: Array<{ id: string; wallet: string; handle: string }>;
  onDone: () => void;
}) {
  const { publicKey, signTransaction, signMessage } = useWallet();
  const record = useServerFn(recordPayout);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const byEntry = new Map(entries.map((e) => [e.id, e]));

  return (
    <div className="rounded-2xl border border-border/70 bg-card/60 p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Step 3 · Push payouts
      </h3>
      <ul className="mt-4 space-y-2">
        {winners.map((w) => {
          const e = byEntry.get(w.entry_id);
          if (!e) return null;
          return (
            <li
              key={w.id}
              className="flex items-center justify-between rounded-lg border border-border/60 bg-secondary/40 px-3 py-2 text-sm"
            >
              <div>
                <div className="font-medium">@{e.handle}</div>
                <div className="font-mono text-xs text-muted-foreground">{shortAddr(e.wallet)}</div>
              </div>
              {w.payout_tx ? (
                <a
                  href={explorerTx(w.payout_tx)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  Paid ↗
                </a>
              ) : (
                <button
                  disabled={!publicKey || !signTransaction || !signMessage || loadingId === w.id}
                  onClick={async () => {
                    if (!publicKey || !signTransaction || !signMessage) return;
                    try {
                      setLoadingId(w.id);
                      const sig = await sendPayoutMemo({
                        payer: publicKey,
                        signTransaction,
                        campaignId: event.id,
                        winnerWallet: e.wallet,
                        share: Number(w.share),
                      });
                      const auth = await signWalletAction({
                        signMessage,
                        pubkey: publicKey.toBase58(),
                        action: "payout",
                        eventId: event.id,
                      });
                      await record({ data: { winner_id: w.id, payout_tx: sig, auth } });
                      toast.success(`Paid @${e.handle}`);
                      onDone();
                    } catch (err) {
                      toast.error((err as Error).message);
                    } finally {
                      setLoadingId(null);
                    }
                  }}
                  className="rounded-md bg-gradient-brand px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-40"
                >
                  {loadingId === w.id ? "Paying…" : `Pay ${Number(w.share)} ${event.prize_token}`}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function EntriesTable({
  entries,
}: {
  entries: Array<{ id: string; handle: string; wallet: string; index: number; created_at: string }>;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/60 p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Verified entries · {entries.length}
      </h3>
      {entries.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No entries yet.</p>
      ) : (
        <table className="mt-3 w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="py-2 text-left font-normal">#</th>
              <th className="text-left font-normal">Handle</th>
              <th className="text-left font-normal">Wallet</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {entries.map((e) => (
              <tr key={e.id}>
                <td className="py-2 font-mono text-xs text-muted-foreground">{e.index + 1}</td>
                <td className="py-2">@{e.handle}</td>
                <td className="py-2 font-mono text-xs">{shortAddr(e.wallet)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}