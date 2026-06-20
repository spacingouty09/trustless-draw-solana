import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { joinEvent } from "@/lib/join.functions";
import {
  getMastodonSession,
  signOutMastodon,
  startMastodonLogin,
} from "@/lib/mastodon-auth.functions";

export function JoinForm({ eventId }: { eventId: string }) {
  const [wallet, setWallet] = useState("");
  const [retryNotice, setRetryNotice] = useState<{ message: string; missing: string[] } | null>(
    null,
  );

  const qc = useQueryClient();
  const join = useServerFn(joinEvent);
  const startLogin = useServerFn(startMastodonLogin);
  const signOut = useServerFn(signOutMastodon);
  const fetchSession = useServerFn(getMastodonSession);

  const sessionQ = useQuery({
    queryKey: ["mastodon-session"],
    queryFn: () => fetchSession(),
    refetchOnWindowFocus: true,
  });
  const session = sessionQ.data;

  const loginMutation = useMutation({
    mutationFn: () => startLogin({ data: { event_id: eventId } }),
    onSuccess: ({ authorize_url }) => {
      // Mastodon instances send X-Frame-Options: DENY, so we can't navigate
      // the Lovable preview iframe to the authorize URL. Break out to the
      // top-level window when we're inside an iframe.
      try {
        if (window.top && window.top !== window.self) {
          window.top.location.href = authorize_url;
          return;
        }
      } catch {
        // Cross-origin top — fall back to opening in a new tab.
        window.open(authorize_url, "_blank", "noopener");
        return;
      }
      window.location.href = authorize_url;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const signOutMutation = useMutation({
    mutationFn: () => signOut(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mastodon-session"] });
      setRetryNotice(null);
    },
  });

  const enter = useMutation({
    mutationFn: (vars: { wallet: string }) => join({ data: { event_id: eventId, ...vars } }),
    onSuccess: (res) => {
      if (res.ok) {
        toast.success(`Verified ✓ — you're entry #${res.entry.index + 1}`);
        setWallet("");
        setRetryNotice(null);
        qc.invalidateQueries({ queryKey: ["event", eventId] });
      } else {
        setRetryNotice({ message: res.message, missing: res.missing });
        toast.warning(res.message);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateWallet = (v: string) => {
    setWallet(v);
    setRetryNotice(null);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!session) return;
        enter.mutate({ wallet });
      }}
      className="rounded-2xl border border-border/70 bg-card/60 p-6"
    >
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Enter the giveaway
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Sign in with Mastodon to prove who you are. We push the prize to your wallet if you win.
      </p>

      <div className="mt-4">
        {sessionQ.isLoading ? (
          <div className="h-11 animate-pulse rounded-lg border border-input bg-background/40" />
        ) : session ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-secondary/40 px-3 py-2.5">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Signed in
              </div>
              <div className="truncate text-sm font-medium">@{session.handle}</div>
            </div>
            <button
              type="button"
              onClick={() => signOutMutation.mutate()}
              disabled={signOutMutation.isPending}
              className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-40"
            >
              Sign out
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => loginMutation.mutate()}
            disabled={loginMutation.isPending}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-background font-medium transition hover:bg-secondary/60 disabled:opacity-40"
          >
            <MastodonGlyph />
            {loginMutation.isPending ? "Redirecting…" : "Sign in with Mastodon"}
          </button>
        )}
      </div>

      <div className="mt-3">
        <Field
          label="Your Solana wallet (devnet)"
          placeholder="A Solana pubkey"
          value={wallet}
          onChange={updateWallet}
          mono
        />
      </div>

      {retryNotice && (
        <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
          <p>{retryNotice.message}</p>
          <button
            type="button"
            onClick={() => enter.mutate({ wallet })}
            disabled={enter.isPending || !session || !wallet}
            className="mt-2 inline-flex h-8 items-center justify-center rounded-md border border-amber-400/50 px-3 text-xs font-medium text-amber-100 transition hover:bg-amber-500/20 disabled:opacity-40"
          >
            {enter.isPending ? "Re-checking…" : "Try again"}
          </button>
        </div>
      )}

      <button
        type="submit"
        disabled={enter.isPending || !session || !wallet}
        className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-lg bg-gradient-brand font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-40"
      >
        {enter.isPending ? "Verifying on Mastodon…" : "Verify & enter"}
      </button>
    </form>
  );
}

function MastodonGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor">
      <path d="M21.6 8.1c0-4.4-2.9-5.7-2.9-5.7C17.2 1.7 14.6 1.5 12 1.5h-.1c-2.6 0-5.2.2-6.7.9 0 0-2.9 1.3-2.9 5.7 0 1 0 2.2.1 3.5.2 4.3.9 8.6 4.9 9.6 1.9.5 3.5.6 4.8.5 2.4-.1 3.7-.8 3.7-.8l-.1-1.7s-1.7.5-3.6.5c-1.9-.1-3.9-.2-4.2-2.5 0-.2 0-.4-.1-.6 0 0 1.9.5 4.2.6 1.4.1 2.8 0 4.1-.2 2.6-.3 4.9-1.9 5.2-3.4.5-2.3.5-5.5.5-5.5zm-3.5 5.8h-2.2V8.5c0-1.1-.5-1.7-1.4-1.7-1 0-1.6.7-1.6 1.9v2.8h-2.2V8.7c0-1.3-.5-1.9-1.6-1.9-1 0-1.4.6-1.4 1.7v5.4H5.5V8.3c0-1.1.3-2 .8-2.6.6-.6 1.3-1 2.3-1 1.1 0 1.9.4 2.5 1.3l.5.9.5-.9c.6-.9 1.4-1.3 2.5-1.3.9 0 1.7.3 2.3 1 .6.6.8 1.5.8 2.6v5.6z" />
    </svg>
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
