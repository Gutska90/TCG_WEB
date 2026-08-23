#!/usr/bin/env node
/**
 * B3 HTTP load (datos sintéticos). No checkout destructivo salvo LOAD_CHECKOUT=1.
 *
 * Smoke (CI/local, respeta throttle search 60/min):
 *   pnpm test:load
 *
 * Staging (operador; search a 50 rps exige subir el throttle de SearchController):
 *   LOAD_SCENARIO=staging LOAD_SECONDS=30 pnpm test:load
 */
import { writeFileSync } from "node:fs";

const origin = (process.env.API_ORIGIN ?? "http://localhost:4000").replace(/\/$/, "");
const scenario = process.env.LOAD_SCENARIO === "staging" ? "staging" : "smoke";
const seconds = Number(process.env.LOAD_SECONDS ?? (scenario === "staging" ? 30 : 8));
const searchRps = Number(process.env.LOAD_SEARCH_RPS ?? (scenario === "staging" ? 50 : 2));
const cardRps = Number(process.env.LOAD_CARD_RPS ?? (scenario === "staging" ? 20 : 2));
const collectionRps = Number(process.env.LOAD_COLLECTION_RPS ?? 2);
const pricesRps = Number(process.env.LOAD_PRICES_RPS ?? 2);
const wishlistRps = Number(process.env.LOAD_WISHLIST_RPS ?? 2);
const adminRps = Number(process.env.LOAD_ADMIN_RPS ?? (scenario === "staging" ? 5 : 1));
const enableCheckout = process.env.LOAD_CHECKOUT === "1";
const buyerEmail = process.env.LOAD_EMAIL ?? "buyer.beta@example.test";
const buyerPassword = process.env.LOAD_PASSWORD ?? "BetaPassw0rd!";
const adminEmail = process.env.LOAD_ADMIN_EMAIL ?? "admin.beta@example.test";
const adminPassword = process.env.LOAD_ADMIN_PASSWORD ?? "BetaPassw0rd!";

/** @typedef {{ name: string; samples: number[]; errors: number; statuses: Record<string, number> }} Bucket */

function percentile(sorted, p) {
  if (sorted.length === 0) return null;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

async function json(path, init = {}) {
  const res = await fetch(`${origin}${path}`, init);
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { res, body };
}

async function login(email, password) {
  const { res, body } = await json("/v1/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok || !body?.accessToken) {
    throw new Error(`login failed ${res.status} ${email}: ${JSON.stringify(body)}`);
  }
  return body.accessToken;
}

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

/**
 * @param {Bucket} bucket
 * @param {string} path
 * @param {RequestInit} [init]
 */
async function sample(bucket, path, init = {}) {
  const started = performance.now();
  try {
    const res = await fetch(`${origin}${path}`, init);
    bucket.samples.push(performance.now() - started);
    bucket.statuses[String(res.status)] = (bucket.statuses[String(res.status)] ?? 0) + 1;
    if (!res.ok) bucket.errors += 1;
    await res.arrayBuffer();
  } catch {
    bucket.samples.push(performance.now() - started);
    bucket.errors += 1;
    bucket.statuses.network = (bucket.statuses.network ?? 0) + 1;
  }
}

async function runAtRps(bucket, rps, durationMs, fn) {
  const interval = 1000 / Math.max(0.1, rps);
  const end = Date.now() + durationMs;
  const inflight = [];
  while (Date.now() < end) {
    inflight.push(fn());
    await new Promise((resolve) => setTimeout(resolve, interval));
    if (inflight.length > rps * 4) {
      await Promise.all(inflight.splice(0, inflight.length - rps));
    }
  }
  await Promise.all(inflight);
  void bucket;
}

function summarize(bucket) {
  const sorted = [...bucket.samples].sort((a, b) => a - b);
  return {
    name: bucket.name,
    n: sorted.length,
    errors: bucket.errors,
    p50_ms: percentile(sorted, 50),
    p95_ms: percentile(sorted, 95),
    p99_ms: percentile(sorted, 99),
    statuses: bucket.statuses,
  };
}

function bucket(name) {
  return { name, samples: [], errors: 0, statuses: {} };
}

async function main() {
  const health = await json("/health");
  if (!health.res.ok) {
    throw new Error(`API no responde en ${origin}/health (${health.res.status})`);
  }

  const searchProbe = await json("/v1/search/cards?q=test&pageSize=5");
  const cardId = searchProbe.body?.items?.[0]?.id ?? null;
  const variantProbe = cardId ? await json(`/v1/cards/${cardId}`) : { body: null };
  const variantId = variantProbe.body?.variants?.[0]?.id ?? variantProbe.body?.defaultVariantId ?? null;

  const buyerToken = await login(buyerEmail, buyerPassword);
  let adminToken = null;
  try {
    adminToken = await login(adminEmail, adminPassword);
  } catch (err) {
    if (scenario === "staging") throw err;
    console.warn(String(err));
  }

  const durationMs = seconds * 1000;
  const searchB = bucket("GET /v1/search/cards");
  const cardB = bucket("GET /v1/cards/:id");
  const colB = bucket("GET /v1/me/collection/items");
  const pricesB = bucket("GET /v1/variants/:id/prices");
  const wishB = bucket("GET /v1/me/wishlist");
  const adminB = bucket("GET /v1/admin/dashboard");
  const checkoutB = bucket("POST /v1/checkout");

  const jobs = [
    runAtRps(searchB, searchRps, durationMs, () => sample(searchB, "/v1/search/cards?q=test&pageSize=20")),
  ];
  jobs.push(
    runAtRps(colB, collectionRps, durationMs, async () => {
      await sample(colB, "/v1/me/collection/items?sort=estimatedValue&pageSize=20", { headers: auth(buyerToken) });
      await sample(colB, "/v1/me/collection/summary", { headers: auth(buyerToken) });
    }),
  );
  if (variantId) {
    jobs.push(
      runAtRps(pricesB, pricesRps, durationMs, () => sample(pricesB, `/v1/variants/${variantId}/prices?range=1a`)),
    );
    jobs.push(
      runAtRps(cardB, cardRps, durationMs, async () => {
        if (cardId) await sample(cardB, `/v1/cards/${cardId}`);
        await sample(cardB, `/v1/variants/${variantId}`);
      }),
    );
  } else if (cardId) {
    jobs.push(runAtRps(cardB, cardRps, durationMs, () => sample(cardB, `/v1/cards/${cardId}`)));
  }
  jobs.push(
    runAtRps(wishB, wishlistRps, durationMs, () => sample(wishB, "/v1/me/wishlist?pageSize=50", { headers: auth(buyerToken) })),
  );
  if (adminToken) {
    jobs.push(
      runAtRps(adminB, adminRps, durationMs, () => sample(adminB, "/v1/admin/dashboard", { headers: auth(adminToken) })),
    );
  }
  if (enableCheckout) {
    jobs.push(
      runAtRps(checkoutB, 2, Math.min(durationMs, 5_000), () =>
        sample(checkoutB, "/v1/checkout", {
          method: "POST",
          headers: { ...auth(buyerToken), "content-type": "application/json" },
          body: JSON.stringify({ shippingSelections: [] }),
        }),
      ),
    );
  }

  await Promise.all(jobs);

  const report = {
    scenario,
    origin,
    seconds,
    searchRps,
    generatedAt: new Date().toISOString(),
    note:
      scenario === "staging" && searchRps > 1
        ? "SearchController limita 60 req/min/IP. 50 rps requiere subir el throttle en la ventana de prueba."
        : undefined,
    results: [searchB, cardB, colB, pricesB, wishB, adminB, checkoutB]
      .filter((row) => row.samples.length > 0)
      .map(summarize),
  };

  const out = process.env.LOAD_REPORT ?? "load-report.json";
  writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  const search = report.results.find((row) => row.name.startsWith("GET /v1/search"));
  if (search && search.p95_ms != null && scenario === "smoke" && search.p95_ms > 2000) {
    throw new Error(`search p95 ${search.p95_ms}ms > 2000ms (smoke sanity)`);
  }
  if (search && search.errors > 0 && search.statuses["429"]) {
    process.stderr.write("search recibió 429 (throttle). En staging 50 rps hay que subir el límite temporalmente.\n");
  }
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});
