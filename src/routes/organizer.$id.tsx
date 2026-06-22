import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { ClientOnly } from "@/components/client-only";

const OrganizerManageClient = lazy(() =>
  import("@/components/organizer-manage-client").then((m) => ({ default: m.OrganizerManageClient })),
);

function ManageFallback() {
  return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
}

export const Route = createFileRoute("/organizer/$id")({
  component: ManageRoute,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-3xl px-6 py-20 text-center text-destructive">{error.message}</div>
  ),
});

function ManageRoute() {
  const { id } = Route.useParams();

  return (
    <ClientOnly fallback={<ManageFallback />}>
      <Suspense fallback={<ManageFallback />}>
        <OrganizerManageClient id={id} />
      </Suspense>
    </ClientOnly>
  );
}