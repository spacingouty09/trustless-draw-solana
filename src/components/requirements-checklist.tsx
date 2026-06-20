import type { Tables } from "@/integrations/supabase/types";

export function RequirementsChecklist({ event }: { event: Tables<"events"> }) {
  const items: Array<{ label: string; href: string }> = [];
  if (event.require_favourite) items.push({ label: "Favourite the post", href: event.mastodon_status_url });
  if (event.require_boost) items.push({ label: "Boost the post", href: event.mastodon_status_url });
  if (event.require_follow)
    items.push({
      label: `Follow @${event.mastodon_account_acct}`,
      href: `https://${event.mastodon_instance}/@${event.mastodon_account_acct}`,
    });
  return (
    <div className="rounded-2xl border border-border/70 bg-card/60 p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">How to enter</h3>
      <ol className="mt-4 space-y-2.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-3">
            <span className="grid h-6 w-6 place-items-center rounded-full border border-border bg-secondary text-xs font-medium">{i + 1}</span>
            <a href={it.href} target="_blank" rel="noreferrer" className="text-sm text-foreground underline-offset-4 hover:text-primary hover:underline">
              {it.label} ↗
            </a>
          </li>
        ))}
        <li className="flex items-center gap-3">
          <span className="grid h-6 w-6 place-items-center rounded-full border border-border bg-secondary text-xs font-medium">{items.length + 1}</span>
          <span className="text-sm text-muted-foreground">
            Submit your handle + wallet — we verify on Mastodon, no signature, no gas.
          </span>
        </li>
      </ol>
    </div>
  );
}