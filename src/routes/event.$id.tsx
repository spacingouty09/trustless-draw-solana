import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getEvent } from "@/lib/events.functions";
import { PrizePoolPanel } from "@/components/prize-pool-panel";
import { RequirementsChecklist } from "@/components/requirements-checklist";
import { JoinForm } from "@/components/join-form";
import { WinnersPanel } from "@/components/winners-panel";
import { Countdown } from "@/components/countdown";

const eventQuery = (id: string) =>
  queryOptions({
    queryKey: ["event", id],
    queryFn: () => getEvent({ data: { id } }),
    refetchInterval: 8_000,
  });

export const Route = createFileRoute("/event/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Giveaway · ChainDraw` },
      { name: "description", content: "Verified on Mastodon, paid on Solana." },
      { property: "og:title", content: `Giveaway · ChainDraw` },
    ],
  }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(eventQuery(params.id)),
  component: EventPage,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-2xl px-6 py-20 text-center">
      <p className="text-destructive">{error.message}</p>
      <Link
        to="/"
        className="mt-4 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to giveaways
      </Link>
    </div>
  ),
  notFoundComponent: () => <div className="p-10 text-center">Event not found.</div>,
});

function EventPage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(eventQuery(id));
  const { event, entries, winners, actions } = data;

  const isOpen = event.status === "open" && new Date(event.cutoff_ts).getTime() > Date.now();
  const isSettled = event.status === "settled";

  const requiredActions = (actions ?? []).filter((a) => a.required);
  const platforms =
    requiredActions.length > 0
      ? [...new Set(requiredActions.map((a) => a.platform))]
      : ["mastodon"];
  const sourceUrl =
    requiredActions.find((a) => a.target_url)?.target_url ?? event.mastodon_status_url;
  const sourceLabel = platforms.includes("farcaster") && !platforms.includes("mastodon")
    ? "Open on Farcaster ↗"
    : "Open on Mastodon ↗";

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← All giveaways
      </Link>
      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{event.title}</h1>
          {event.description && (
            <p className="mt-2 max-w-2xl text-muted-foreground">{event.description}</p>
          )}
        </div>
        <div className="text-right text-sm">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            {isSettled ? "Drawn" : "Closes in"}
          </div>
          <div className="mt-1 text-base">
            <Countdown to={event.cutoff_ts} />
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <PrizePoolPanel event={event} />
          {isSettled ? (
            <WinnersPanel event={event} entries={entries} winners={winners} />
          ) : (
            <RequirementsChecklist event={event} actions={actions} />
          )}
          <EntriesPanel entries={entries} />
        </div>
        <div className="space-y-6">
          {isOpen ? (
            <JoinForm eventId={event.id} platforms={platforms} />
          ) : (
            <div className="rounded-2xl border border-border/70 bg-card/60 p-6 text-sm text-muted-foreground">
              {isSettled
                ? "This giveaway has been drawn. See winners on the left."
                : event.status === "draft"
                  ? "Organizer hasn't committed the prize pool yet."
                  : "Entry window closed. Awaiting draw."}
            </div>
          )}
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="block rounded-2xl border border-border/70 bg-card/60 p-6 text-sm hover:border-primary/50"
            >
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Source post
              </div>
              <div className="mt-1 break-all font-mono text-xs">{sourceUrl}</div>
              <div className="mt-2 text-xs text-primary">{sourceLabel}</div>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function EntriesPanel({
  entries,
}: {
  entries: Array<{ id: string; handle: string; wallet: string; index: number }>;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/60 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Verified entries
        </h3>
        <span className="font-mono text-xs">{entries.length}</span>
      </div>
      {entries.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No entries yet.</p>
      ) : (
        <ul className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
          {entries.map((e) => (
            <li
              key={e.id}
              className="truncate rounded-md border border-border/60 bg-secondary/40 px-2 py-1.5"
            >
              <span className="text-muted-foreground">#{e.index + 1}</span> @{e.handle}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
