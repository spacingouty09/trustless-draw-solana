// Mastodon adapter — server-only. Uses public endpoints, no auth required for public posts.

// SSRF guard: reject hostnames that resolve (textually) to private, loopback,
// link-local, or otherwise non-public ranges, so user-supplied Mastodon URLs
// can't be used to probe internal infrastructure.
function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase().split(":")[0]; // strip port
  if (!h || h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") ||
      h.endsWith(".internal") || h.endsWith(".intranet")) return true;
  // IPv6 loopback / link-local / unique-local
  if (h === "::1" || h.startsWith("[::1") || h.startsWith("fe80") || h.startsWith("fc") ||
      h.startsWith("fd")) return true;
  // IPv4 dotted-quad ranges
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true; // link-local / metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a >= 224) return true; // multicast + reserved
  }
  return false;
}

function assertSafeInstance(host: string) {
  if (!host || isPrivateHost(host)) {
    throw new Error("Mastodon instance host is not allowed");
  }
}

export type MastodonStatus = {
  id: string;
  url: string;
  uri?: string;
  account: { id: string; acct: string; username: string };
  instance: string;
};

function instanceFromUrl(url: string): string {
  const host = new URL(url).host;
  assertSafeInstance(host);
  return host;
}

export async function resolveStatus(statusUrl: string): Promise<MastodonStatus> {
  const u = new URL(statusUrl);
  if (u.protocol !== "https:") throw new Error("Mastodon status URL must use https://");
  const instance = u.host;
  assertSafeInstance(instance);
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
    uri?: string;
    account: { id: string; acct: string; username: string };
  };
  return { ...data, instance };
}

export async function lookupAccount(instance: string, acct: string) {
  assertSafeInstance(instance);
  const res = await fetch(
    `https://${instance}/api/v1/accounts/lookup?acct=${encodeURIComponent(acct)}`,
    { headers: { Accept: "application/json" } },
  );
  if (!res.ok) throw new Error(`Account lookup failed (${acct}): ${res.status}`);
  return (await res.json()) as { id: string; acct: string; username: string; url: string };
}

type PagedAccount = { id: string; acct: string; username: string };

type AccountStatus = {
  id: string;
  url?: string | null;
  uri?: string | null;
  reblog?: {
    id: string;
    url?: string | null;
    uri?: string | null;
  } | null;
};

async function fetchAllPaginated(url: string, maxPages = 8): Promise<PagedAccount[]> {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return [];
    assertSafeInstance(parsed.host);
  } catch {
    return [];
  }
  const out: PagedAccount[] = [];
  let next: string | null = url;
  let pages = 0;
  while (next && pages < maxPages) {
    try {
      const parsedNext = new URL(next);
      if (parsedNext.protocol !== "https:") break;
      assertSafeInstance(parsedNext.host);
    } catch {
      break;
    }
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

function normalizeStatusRef(value: string | null | undefined) {
  if (!value) return "";
  try {
    const url = new URL(value);
    url.hash = "";
    url.search = "";
    return `${url.host.toLowerCase()}${url.pathname.replace(/\/$/, "")}`;
  } catch {
    return value.toLowerCase().replace(/\/$/, "");
  }
}

export async function hasBoostedStatus(
  postInstance: string,
  statusId: string,
  statusUrl: string,
  handle: string,
) {
  const cleanHandle = handle.toLowerCase().replace(/^@/, "");
  const [, userInstance] = cleanHandle.split("@");
  const instances = Array.from(new Set([postInstance.toLowerCase(), userInstance].filter(Boolean)));
  const targetRefs = new Set([
    statusId,
    normalizeStatusRef(statusUrl),
    normalizeStatusRef(`https://${postInstance}/statuses/${statusId}`),
  ]);

  for (const instance of instances) {
    try {
      const account = await lookupAccount(instance, cleanHandle);
      const res = await fetch(
        `https://${instance}/api/v1/accounts/${account.id}/statuses?limit=40&exclude_replies=true&exclude_reblogs=false`,
        { headers: { Accept: "application/json" } },
      );
      if (!res.ok) continue;
      const statuses = (await res.json()) as AccountStatus[];
      if (
        statuses.some((status) => {
          const boosted = status.reblog;
          if (!boosted) return false;
          return [boosted.id, normalizeStatusRef(boosted.url), normalizeStatusRef(boosted.uri)].some((ref) =>
            targetRefs.has(ref),
          );
        })
      ) {
        return true;
      }
    } catch {
      // Some instances disable lookup/status endpoints for remote accounts; try the next public view.
    }
  }

  return false;
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