// Mastodon adapter — server-only. Uses public endpoints, no auth required for public posts.

export type MastodonStatus = {
  id: string;
  url: string;
  account: { id: string; acct: string; username: string };
  instance: string;
};

function instanceFromUrl(url: string): string {
  return new URL(url).host;
}

export async function resolveStatus(statusUrl: string): Promise<MastodonStatus> {
  const u = new URL(statusUrl);
  const instance = u.host;
  // status URL typically looks like https://instance/@user/<id>
  const segments = u.pathname.split("/").filter(Boolean);
  const id = segments[segments.length - 1];
  if (!/^\d+$/.test(id)) {
    throw new Error("Could not parse status id from URL");
  }
  const res = await fetch(`https://${instance}/api/v1/statuses/${id}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Status fetch failed: ${res.status}`);
  const data = (await res.json()) as {
    id: string;
    url: string;
    account: { id: string; acct: string; username: string };
  };
  return { ...data, instance };
}

export async function lookupAccount(instance: string, acct: string) {
  const res = await fetch(
    `https://${instance}/api/v1/accounts/lookup?acct=${encodeURIComponent(acct)}`,
    { headers: { Accept: "application/json" } },
  );
  if (!res.ok) throw new Error(`Account lookup failed (${acct}): ${res.status}`);
  return (await res.json()) as { id: string; acct: string; username: string; url: string };
}

type PagedAccount = { id: string; acct: string; username: string };

async function fetchAllPaginated(url: string, maxPages = 8): Promise<PagedAccount[]> {
  const out: PagedAccount[] = [];
  let next: string | null = url;
  let pages = 0;
  while (next && pages < maxPages) {
    const res: Response = await fetch(next, { headers: { Accept: "application/json" } });
    if (!res.ok) break;
    const batch = (await res.json()) as PagedAccount[];
    out.push(...batch);
    const linkHeader = res.headers.get("link") || res.headers.get("Link");
    next = parseNextLink(linkHeader);
    pages++;
  }
  return out;
}

function parseNextLink(header: string | null): string | null {
  if (!header) return null;
  const parts = header.split(",");
  for (const part of parts) {
    const m = part.match(/<([^>]+)>;\s*rel="next"/);
    if (m) return m[1];
  }
  return null;
}

export async function getFavourited(instance: string, statusId: string) {
  return fetchAllPaginated(
    `https://${instance}/api/v1/statuses/${statusId}/favourited_by?limit=80`,
  );
}

export async function getReblogged(instance: string, statusId: string) {
  return fetchAllPaginated(
    `https://${instance}/api/v1/statuses/${statusId}/reblogged_by?limit=80`,
  );
}

export async function getFollowers(instance: string, accountId: string) {
  return fetchAllPaginated(
    `https://${instance}/api/v1/accounts/${accountId}/followers?limit=80`,
  );
}

export function matchesHandle(target: string, account: PagedAccount, targetInstance: string) {
  const t = target.toLowerCase().replace(/^@/, "");
  const [tUser, tInstance] = t.split("@");
  const localAcct = account.acct.toLowerCase();
  const accInstance = (account as { acct: string }).acct.includes("@")
    ? localAcct.split("@")[1]
    : targetInstance.toLowerCase();
  const accUser = localAcct.split("@")[0];
  // exact match (handles "user@remote" === "user@remote")
  if (localAcct === t) return true;
  // target has instance; account is local on that same instance (returned as bare "user")
  if (tInstance && tInstance === targetInstance.toLowerCase() && localAcct === tUser) return true;
  // target has no instance — assume same instance as the post
  if (!tInstance && localAcct === tUser) return true;
  // both normalised to user+instance form
  if (tInstance && accUser === tUser && accInstance === tInstance) return true;
  return false;
}

export { instanceFromUrl };