"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { CARD_CONDITION_LABELS, CARD_CONDITIONS, formatClp } from "@tcg/config";
import type { CollectionItemView, CollectionSetProgressView, CollectionSummaryView, Paginated } from "@tcg/types";
import { ApiError, api } from "../../../lib/api";
import { track } from "../../../lib/analytics";
import { loginHref, userFacingError } from "../../../lib/errors";
import { FormError, LoadingBlock, PageMain, SuccessNote } from "../../../components/ui-feedback";

function money(value: number | null, empty = "Sin precio suficiente") {
  return value == null ? empty : formatClp(value);
}

function CollectionHome() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [summary, setSummary] = useState<CollectionSummaryView | null>(null);
  const [sets, setSets] = useState<CollectionSetProgressView[]>([]);
  const [page, setPage] = useState<Paginated<CollectionItemView> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, setPending] = useState(false);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    const q = searchParams.get("q");
    const game = searchParams.get("game");
    const set = searchParams.get("set");
    const condition = searchParams.get("condition");
    const duplicates = searchParams.get("duplicates");
    const sort = searchParams.get("sort") ?? "recent";
    const pageNo = searchParams.get("page") ?? "1";
    if (q) params.set("q", q);
    if (game) params.set("game", game);
    if (set) params.set("set", set);
    if (condition) params.set("condition", condition);
    if (duplicates === "true") params.set("duplicates", "true");
    params.set("sort", sort);
    params.set("page", pageNo);
    params.set("pageSize", "20");
    return params;
  }, [searchParams]);

  useEffect(() => {
    Promise.all([
      api<CollectionSummaryView>("/v1/me/collection/summary"),
      api<Paginated<CollectionItemView>>(`/v1/me/collection/items?${query.toString()}`),
      api<CollectionSetProgressView[]>("/v1/me/collection/sets"),
    ])
      .then(([nextSummary, nextPage, nextSets]) => {
        setSummary(nextSummary);
        setPage(nextPage);
        setSets(nextSets);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace(loginHref("/me/coleccion"));
          return;
        }
        setError(userFacingError(err));
      });
  }, [query, router]);

  function updateFilter(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.replace(`/me/coleccion?${next.toString()}`);
  }

  async function bulkDelete() {
    if (selected.length === 0 || pending) return;
    setPending(true);
    setNotice(null);
    try {
      await api("/v1/me/collection/items/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ ids: selected }),
      });
      track("collection_item_removed", { count: selected.length });
      setSelected([]);
      setNotice("Ítems eliminados.");
      const [nextSummary, nextPage] = await Promise.all([
        api<CollectionSummaryView>("/v1/me/collection/summary"),
        api<Paginated<CollectionItemView>>(`/v1/me/collection/items?${query.toString()}`),
      ]);
      setSummary(nextSummary);
      setPage(nextPage);
    } catch (err: unknown) {
      setError(userFacingError(err));
    } finally {
      setPending(false);
    }
  }

  if (error && !summary) {
    return (
      <PageMain>
        <FormError message={error} />
      </PageMain>
    );
  }
  if (!summary || !page) {
    return (
      <PageMain>
        <LoadingBlock />
      </PageMain>
    );
  }

  return (
    <PageMain width="lg">
      <h1 className="text-2xl font-semibold">Mi colección</h1>
      <p className="mt-2 text-sm text-neutral-600">{summary.disclaimer}</p>
      <FormError message={error} />
      <SuccessNote message={notice} />
      <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Kpi label="Total de cartas" value={String(summary.totalCards)} />
        <Kpi label="Cartas únicas" value={String(summary.uniqueCards)} />
        <Kpi label="Valor estimado" value={money(summary.estimatedValueClp)} />
        <Kpi
          label="Variación 30 días"
          value={
            summary.change30dClp == null
              ? "Sin historial suficiente"
              : `${summary.change30dClp >= 0 ? "+" : ""}${formatClp(summary.change30dClp)}`
          }
        />
        <Kpi
          label="Costo registrado"
          value={`${money(summary.registeredCostClp, "Sin costo registrado")}${
            summary.itemsWithoutCost ? ` · ${summary.itemsWithoutCost} sin costo` : ""
          }`}
        />
        <Kpi label="P/L estimado" value={money(summary.estimatedPlClp, "Sin precio suficiente")} />
        <Kpi
          label="Duplicados"
          value={`${summary.duplicateCards} cartas / ${summary.extraCopies} copias extra`}
        />
      </dl>

      {summary.totalCards === 0 ? (
        <div className="mt-8 rounded border p-6">
          <p className="font-medium">Aún no tienes cartas en tu colección.</p>
          <p className="mt-2 text-sm text-neutral-600">
            Agrega tus cartas para llevar registro de cantidad, costo y valor estimado.
          </p>
          <Link href="/buscar" className="mt-4 inline-block underline">
            Buscar cartas
          </Link>
        </div>
      ) : (
        <>
          <form className="mt-8 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5" onSubmit={(event) => event.preventDefault()}>
            <label>
              Buscar
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                defaultValue={searchParams.get("q") ?? ""}
                onBlur={(event) => updateFilter("q", event.target.value.trim())}
              />
            </label>
            <label>
              Juego
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                defaultValue={searchParams.get("game") ?? ""}
                placeholder="slug"
                onBlur={(event) => updateFilter("game", event.target.value.trim())}
              />
            </label>
            <label>
              Set
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                defaultValue={searchParams.get("set") ?? ""}
                placeholder="slug"
                onBlur={(event) => updateFilter("set", event.target.value.trim())}
              />
            </label>
            <label>
              Condición
              <select
                className="mt-1 w-full rounded border px-3 py-2"
                value={searchParams.get("condition") ?? ""}
                onChange={(event) => updateFilter("condition", event.target.value)}
              >
                <option value="">Todas</option>
                {CARD_CONDITIONS.map((code) => (
                  <option key={code} value={code}>
                    {code} · {CARD_CONDITION_LABELS[code]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Orden
              <select
                className="mt-1 w-full rounded border px-3 py-2"
                value={searchParams.get("sort") ?? "recent"}
                onChange={(event) => updateFilter("sort", event.target.value)}
              >
                <option value="recent">Recientes</option>
                <option value="name">Nombre</option>
                <option value="estimatedValue">Valor estimado</option>
                <option value="quantity">Cantidad</option>
              </select>
            </label>
          </form>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={searchParams.get("duplicates") === "true"}
              onChange={(event) => updateFilter("duplicates", event.target.checked ? "true" : "")}
            />
            Solo duplicadas
          </label>

          {selected.length > 0 ? (
            <button
              type="button"
              className="mt-4 rounded border px-3 py-2 text-sm"
              disabled={pending}
              onClick={() => void bulkDelete()}
            >
              Eliminar seleccionados ({selected.length})
            </button>
          ) : null}

          <ul className="mt-6 grid gap-3">
            {page.items.map((item) => (
              <li key={item.id} className="flex gap-3 rounded border p-3">
                <input
                  type="checkbox"
                  aria-label={`Seleccionar ${item.variant.card.name}`}
                  checked={selected.includes(item.id)}
                  onChange={(event) => {
                    setSelected((current) =>
                      event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id),
                    );
                  }}
                />
                <Link href={`/me/coleccion/${item.id}`} className="flex min-w-0 flex-1 gap-3">
                  {item.variant.card.imageUrl ? (
                    // Catalog source URL; we do not host publisher art.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.variant.card.imageUrl}
                      alt=""
                      className="h-16 w-12 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-12 items-center justify-center rounded bg-neutral-100 text-[10px] text-neutral-400">
                      Sin imagen
                    </div>
                  )}
                  <span className="min-w-0">
                    <span className="block font-medium">{item.variant.card.name}</span>
                    <span className="block text-sm text-neutral-600">
                      {item.variant.card.setSlug} · {item.variant.card.number} · {item.condition} · ×{item.quantity}
                    </span>
                    <span className="block text-sm">
                      Est. {money(item.estimatedValueClp)}
                      {item.registeredCostClp != null ? ` · Costo ${formatClp(item.registeredCostClp)}` : ""}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {page.total > page.pageSize ? (
            <p className="mt-4 text-sm">
              Página {page.page} de {Math.ceil(page.total / page.pageSize)}
            </p>
          ) : null}
        </>
      )}

      {sets.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-lg font-medium">Progreso por set</h2>
          <ul className="mt-3 grid gap-2">
            {sets.map((row) => (
              <li key={row.setId}>
                <Link href={`/me/coleccion/sets/${row.setId}`} className="block rounded border p-3 text-sm">
                  <span className="font-medium">{row.gameName} {row.setName}</span>
                  <span className="mt-1 block text-neutral-600">
                    {row.ownedUnique} / {row.total} · {row.percentage}% · duplicados {row.extraCopies}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </PageMain>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border p-3">
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}

export default function CollectionPage() {
  return (
    <Suspense fallback={<PageMain><LoadingBlock /></PageMain>}>
      <CollectionHome />
    </Suspense>
  );
}
