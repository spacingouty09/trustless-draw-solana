import "@/lib/buffer-polyfill";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { listOrganizerEvents } from "@/lib/events.functions";
import { createEvent } from "@/lib/organizer.functions";
import { Countdown } from "@/components/countdown";

export function OrganizerHomeClient() {
  const { publicKey, connected } = useWallet();
  const pk = publicKey?.toBase58();

  const list = useQuery({
    queryKey: ["organizer-events", pk],
    enabled: !!pk,
    queryFn: () => listOrganizerEvents({ data: { organizer: pk! } }),
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Organizer</h1>
      </div>

      {!connected ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border/70 bg-card/40 p-10 text-center">
          <p className="text-base font-medium">Connect a Solana wallet to get started</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Devnet only. Use Phantom or Solflare with devnet mode enabled.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Your giveaways
            </h2>
            <div className="mt-4 space-y-3">
              {(list.data ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nothing here yet. Create your first giveaway on the right.
                </p>
              )}
              {(list.data ?? []).map((e) => (
                <Link
                  key={e.id}
                  to="/organizer/$id"
                  params={{ id: e.id }}
                  className="flex items-center justify-between rounded-xl border border-border/70 bg-card/60 px-4 py-3 hover:border-primary/50"
                >
                  <div>
                    <div className="font-medium">{e.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {Number(e.prize_total).toLocaleString()} {e.prize_token} · {e.num_winners} winners
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <div className="text-muted-foreground">{e.status}</div>
                    <Countdown to={e.cutoff_ts} />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <CreateEventCard organizer={pk!} onCreated={() => list.refetch()} />
        </div>
      )}
    </div>
  );
}

function CreateEventCard({ organizer, onCreated }: { organizer: string; onCreated: () => void }) {
  const create = useServerFn(createEvent);
  const nav = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: "Launch giveaway",
    description: "",
    mastodon_status_url: "",
    require_favourite: true,
    require_boost: true,
    require_follow: false,
    follow_url: "",
    prize_token: "USDC",
    prize_total: 100,
    num_winners: 3,
    cutoff_hours: 24,
  });

  const m = useMutation({
    mutationFn: async () => {
      if (!form.require_favourite && !form.require_boost && !form.require_follow) {
        throw new Error("Pick at least one task for participants.");
      }
      if (form.require_follow && !form.follow_url.trim()) {
        throw new Error("Add the page URL participants should follow.");
      }
      const cutoff_ts = new Date(Date.now() + form.cutoff_hours * 3600 * 1000).toISOString();
      return create({
        data: {
          organizer_pubkey: organizer,
          title: form.title,
          description: form.description,
          mastodon_status_url: form.mastodon_status_url,
          require_favourite: form.require_favourite,
          require_boost: form.require_boost,
          require_follow: form.require_follow,
          prize_token: form.prize_token,
          prize_total: Number(form.prize_total),
          num_winners: Number(form.num_winners),
          cutoff_ts,
        },
      });
    },
    onSuccess: (row) => {
      toast.success("Event created. Next: commit the prize pool.");
      qc.invalidateQueries({ queryKey: ["organizer-events", organizer] });
      onCreated();
      if (row) nav({ to: "/organizer/$id", params: { id: row.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        m.mutate();
      }}
      className="rounded-2xl border border-border/70 bg-card/60 p-6"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        New giveaway
      </h2>
      <div className="mt-4 space-y-3">
        <TF label="Title" value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} />
        <TF
          label="Mastodon post URL"
          placeholder="https://mastodon.social/@you/123…"
          value={form.mastodon_status_url}
          onChange={(v) => setForm((f) => ({ ...f, mastodon_status_url: v }))}
        />
        <TF
          label="Description"
          value={form.description}
          onChange={(v) => setForm((f) => ({ ...f, description: v }))}
        />
        <div className="rounded-lg border border-border/70 bg-background/40 p-3">
          <div className="mb-2 text-xs text-muted-foreground">
            Tasks participants must complete (pick at least one)
          </div>
          <div className="space-y-2">
            <CheckRow
              label="Like the post"
              checked={form.require_favourite}
              onChange={(v) => setForm((f) => ({ ...f, require_favourite: v }))}
            />
            <CheckRow
              label="Share the post"
              checked={form.require_boost}
              onChange={(v) => setForm((f) => ({ ...f, require_boost: v }))}
            />
            <CheckRow
              label="Follow page"
              checked={form.require_follow}
              onChange={(v) => setForm((f) => ({ ...f, require_follow: v }))}
            />
            {form.require_follow && (
              <div className="pl-7">
                <input
                  type="url"
                  placeholder="https://mastodon.social/@yourpage"
                  value={form.follow_url}
                  onChange={(e) => setForm((f) => ({ ...f, follow_url: e.target.value }))}
                  className="block h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Page URL participants need to follow.
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <TF
            label="Prize"
            type="number"
            value={String(form.prize_total)}
            onChange={(v) => setForm((f) => ({ ...f, prize_total: Number(v) }))}
          />
          <TF label="Token" value={form.prize_token} onChange={(v) => setForm((f) => ({ ...f, prize_token: v }))} />
          <TF
            label="Winners"
            type="number"
            value={String(form.num_winners)}
            onChange={(v) => setForm((f) => ({ ...f, num_winners: Number(v) }))}
          />
        </div>
        <TF
          label="Closes in (hours)"
          type="number"
          value={String(form.cutoff_hours)}
          onChange={(v) => setForm((f) => ({ ...f, cutoff_hours: Number(v) }))}
        />
      </div>
      <button
        type="submit"
        disabled={m.isPending}
        className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-lg bg-gradient-brand font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {m.isPending ? "Creating…" : "Create event"}
      </button>
    </form>
  );
}

function TF({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}

function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-md px-1 py-1 hover:bg-secondary/40">
      <span
        className={`grid h-5 w-5 place-items-center rounded border transition-colors ${
          checked ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"
        }`}
      >
        {checked && (
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 8.5l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="text-sm">{label}</span>
    </label>
  );
}