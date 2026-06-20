import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/organizer")({
  head: () => ({
    meta: [
      { title: "Organizer · ChainDraw" },
      { name: "description", content: "Create on-chain-committed giveaways and draw winners." },
    ],
  }),
  component: () => <Outlet />,
});