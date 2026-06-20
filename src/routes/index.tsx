import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listEvents } from "@/lib/events.functions";
import { EventCard } from "@/components/event-card";

const eventsQuery = queryOptions({
  queryKey: ["events"],
  queryFn: () => listEvents(),
  refetchInterval: 10_000,
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ChainDraw — Trustless social giveaways on Solana" },
      {
        name: "description",
        content:
          "Browse live, on-chain-committed giveaways. Verified via Mastodon. Auto-paid to winners on Solana devnet.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(eventsQuery),
  component: Index,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-3xl px-6 py-20 text-center text-destructive">{error.message}</div>
  ),
});

function Index() {
  const { data: events } = useSuspenseQuery(eventsQuery);
  return (
    <div>
      <Hero hasEvents={events.length > 0} />
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Live giveaways</h2>
          <span className="text-xs text-muted-foreground">{events.length} total</span>
        </div>
        {events.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Hero({ hasEvents }: { hasEvents: boolean }) {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
      <div className="relative mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <div className="flex flex-col items-start gap-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_oklch(0.78_0.19_162)]" />
            Live on Solana devnet
          </span>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
            Trustless social giveaways,{" "}
            <span className="text-gradient">committed on-chain.</span>
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
            Brands lock the prize pool with Solana Fixed Delegation. Entries are verified from
            Mastodon. Winners are auto-paid. Participants never sign, never pay, never trust.
          </p>
          <div className="flex flex-wrap gap-3">
            {hasEvents && (
              <a
                href="#live"
                className="inline-flex h-11 items-center rounded-lg bg-gradient-brand px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Browse live giveaways
              </a>
            )}
            <Link
              to="/organizer"
              className="inline-flex h-11 items-center rounded-lg border border-border bg-card/60 px-5 text-sm font-medium backdrop-blur transition-colors hover:bg-card"
            >
              Run a giveaway →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 p-12 text-center">
      <p className="text-base font-medium">No giveaways yet</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Be the first to commit a prize pool on-chain.
      </p>
      <Link
        to="/organizer"
        className="mt-5 inline-flex h-10 items-center rounded-lg bg-gradient-brand px-5 text-sm font-medium text-primary-foreground"
      >
        Run a giveaway →
      </Link>
    </div>
  );
}
