import type { Tables } from "@/integrations/supabase/types";

export type CampaignAction = {
  id: string;
  platform: string;
  action_type: string;
  target_url: string | null;
  label: string;
  required: boolean;
  sort: number;
};

const PLATFORM_NAMES: Record<string, string> = {
  mastodon: "Mastodon",
  farcaster: "Farcaster",
  bluesky: "Bluesky",
};

export function RequirementsChecklist({
  event,
  actions,
}: {
  event: Tables<"events">;
  actions?: CampaignAction[];
}) {
  let items: Array<{ label: string; href: string | null; platform: string }>;

  if (actions && actions.length > 0) {
    items = actions
      .filter((a) => a.required)
      .map((a) => ({ label: a.label, href: a.target_url, platform: a.platform }));
  } else {
    // Legacy events created before the actions model.
    items = [];
    if (event.require_favourite && event.mastodon_status_url)
      items.push({ label: "Like the post", href: event.mastodon_status_url, platform: "mastodon" });
    if (event.require_boost && event.mastodon_status_url)
      items.push({ label: "Share the post", href: event.mastodon_status_url, platform: "mastodon" });
    if (event.require_follow && event.mastodon_instance && event.mastodon_account_acct)
      items.push({
        label: `Follow page @${event.mastodon_account_acct}`,
        href: `https://${event.mastodon_instance}/@${event.mastodon_account_acct}`,
        platform: "mastodon",
      });
  }

  const platforms = [...new Set(items.map((i) => i.platform))];

  return (
    <div className="rounded-2xl border border-border/70 bg-card/60 p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        How to enter
      </h3>
      <ol className="mt-4 space-y-2.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-3">
            <span className="grid h-6 w-6 place-items-center rounded-full border border-border bg-secondary text-xs font-medium">
              {i + 1}
            </span>
            {it.href ? (
              <a
                href={it.href}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-foreground underline-offset-4 hover:text-primary hover:underline"
              >
                {it.label} ↗
              </a>
            ) : (
              <span className="text-sm text-foreground">{it.label}</span>
            )}
            <span className="ml-auto rounded-full border border-border/60 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              {PLATFORM_NAMES[it.platform] ?? it.platform}
            </span>
          </li>
        ))}
        <li className="flex items-center gap-3">
          <span className="grid h-6 w-6 place-items-center rounded-full border border-border bg-secondary text-xs font-medium">
            {items.length + 1}
          </span>
          <span className="text-sm text-muted-foreground">
            Sign in with {platforms.map((p) => PLATFORM_NAMES[p] ?? p).join(" + ")} — we verify
            every action, no signature, no gas.
          </span>
        </li>
      </ol>
    </div>
  );
}
