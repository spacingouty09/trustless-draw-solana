import { createFileRoute, Outlet, useRouter } from "@tanstack/react-router";

export const Route = createFileRoute("/organizer")({
  head: () => ({
    meta: [
      { title: "Organizer · ChainDraw" },
      { name: "description", content: "Create on-chain-committed giveaways and draw winners." },
    ],
  }),
  component: () => <Outlet />,
  errorComponent: OrganizerError,
});

function OrganizerError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-center">
      <h1 className="text-xl font-semibold text-destructive">Organizer error</h1>
      <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{error.message}</p>
      <button
        type="button"
        onClick={() => {
          reset();
          router.invalidate();
        }}
        className="mt-6 rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
      >
        Try again
      </button>
    </div>
  );
}
