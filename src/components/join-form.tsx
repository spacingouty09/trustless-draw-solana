import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { joinEvent } from "@/lib/join.functions";

export function JoinForm({ eventId }: { eventId: string }) {
  const [handle, setHandle] = useState("");
  const [wallet, setWallet] = useState("");
  const join = useServerFn(joinEvent);
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (vars: { handle: string; wallet: string }) =>
      join({ data: { event_id: eventId, ...vars } }),
    onSuccess: (res) => {
      toast.success(`Verified ✓ — you're entry #${res.entry.index + 1}`);
      setHandle("");
      setWallet("");
      qc.invalidateQueries({ queryKey: ["event", eventId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        m.mutate({ handle, wallet });
      }}
      className="rounded-2xl border border-border/70 bg-card/60 p-6"
    >
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Enter the giveaway</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Participants don't sign or pay. We push the prize to your wallet if you win.
      </p>
      <div className="mt-4 space-y-3">
        <Field label="Your Mastodon handle" placeholder="user@mastodon.social" value={handle} onChange={setHandle} />
        <Field label="Your Solana wallet (devnet)" placeholder="A Solana pubkey" value={wallet} onChange={setWallet} mono />
      </div>
      <button
        type="submit"
        disabled={m.isPending || !handle || !wallet}
        className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-lg bg-gradient-brand font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-40"
      >
        {m.isPending ? "Verifying on Mastodon…" : "Verify & enter"}
      </button>
    </form>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChange,
  mono,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`mt-1 block h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none ring-ring focus:ring-2 ${mono ? "font-mono" : ""}`}
      />
    </label>
  );
}