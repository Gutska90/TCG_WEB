import type { TorEditionPayload } from "./map-card";

export const FENIX_API_BASE = "https://api.myl.cl";
const USER_AGENT = "tcg-platform/0.1 (catalog-import; official Fenix TOR API)";

export async function fetchTorEdition(
  slug: string,
  fetchImpl: typeof fetch = fetch,
): Promise<TorEditionPayload> {
  const url = `${FENIX_API_BASE}/cards/edition/${encodeURIComponent(slug)}`;
  let lastStatus = 0;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const res = await fetchImpl(url, {
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    });
    lastStatus = res.status;
    if (res.ok) {
      return (await res.json()) as TorEditionPayload;
    }
    if (res.status === 400 || res.status === 404) {
      return { status: "EDITION_NOT_FOUND" };
    }
    if (res.status >= 500 && attempt < 2) {
      await delay(400 * (attempt + 1));
      continue;
    }
    if (res.status >= 500) {
      return { status: "EDITION_NOT_FOUND" };
    }
    throw new Error(`Fénix API ${res.status} ${url}`);
  }
  throw new Error(`Fénix API ${lastStatus} ${url}`);
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
