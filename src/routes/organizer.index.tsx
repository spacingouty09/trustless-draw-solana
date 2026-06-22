import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { ClientOnly } from "@/components/client-only";

const OrganizerHomeClient = lazy(() =>
  import("@/components/organizer-home-client").then((m) => ({ default: m.OrganizerHomeClient })),
);

function OrganizerFallback() {
  return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
}

export const Route = createFileRoute("/organizer/")({
  component: OrganizerHome,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-3xl px-6 py-20 text-center text-destructive">{error.message}</div>
  ),
});

function OrganizerHome() {
  return (
    <ClientOnly fallback={<OrganizerFallback />}>
      <Suspense fallback={<OrganizerFallback />}>
        <OrganizerHomeClient />
      </Suspense>
    </ClientOnly>
  );
}