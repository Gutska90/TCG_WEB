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
import { buttonClassName } from "../../../components/ui/button-styles";
import { CardImage } from "../../../components/ui/product-card";
import { controlClassName } from "../../../components/ui/input";
import { EmptyState } from "../../../components/ui/empty-state";
import { ProgressBar, StatCard } from "../../../components/ui/stat-card";

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
  const [view, setView] = useState<"grid" | "list">("grid");

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
      <h1 className="text-3xl font-medium tracking-tight">Mi colección</h1>
      <p className="mt-2 text-sm text-text-muted">{summary.disclaimer}</p>
      <FormError message={error} />
      <SuccessNote message={notice} />
      <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Valor estimado" value={money(summary.estimatedValueClp)} />
        <StatCard label="Total cartas" value={String(summary.totalCards)} />
        <StatCard label="Cartas únicas" value={String(summary.uniqueCards)} />
        <StatCard
          label="Duplicadas"
          value={`${summary.duplicateCards}`}
          hint={`${summary.extraCopies} copias extra`}
        />
        <StatCard
          label="Variación 30 días"
          value={
            summary.change30dClp == null
              ? "Sin historial suficiente"
              : `${summary.change30dClp >= 0 ? "+" : ""}${formatClp(summary.change30dClp)}`
          }
        />
        <StatCard
          label="Costo registrado"
          value={money(summary.registeredCostClp, "Sin costo registrado")}
          hint={summary.itemsWithoutCost ? `${summary.itemsWithoutCost} sin costo` : undefined}
        />
        <StatCard label="P/L estimado" value={money(summary.estimatedPlClp, "Sin precio suficiente")} />
      </dl>

      {summary.totalCards === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="Aún no tienes cartas."
            body="Agrega tus cartas para llevar registro de cantidad, costo y valor estimado."
            action={
              <Link href="/buscar" className="underline">
                Buscar cartas
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-8 flex flex-wrap gap-2">
            <button
              type="button"
              className={buttonClassName(!searchParams.get("game") ? "primary" : "secondary", "min-h-9 py-1")}
              onClick={() => updateFilter("game", "")}
            >
              Todas
            </button>
            {[...new Map(sets.map((row) => [row.gameSlug, row.gameName])).entries()].map(([slug, name]) => (
              <button
                key={slug}
                type="button"
                className={buttonClassName(searchParams.get("game") === slug ? "primary" : "secondary", "min-h-9 py-1")}
                onClick={() => updateFilter("game", slug)}
              >
                {name}
              </button>
            ))}
          </div>
          <form className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5" onSubmit={(event) => event.preventDefault()}>
            <label>
              Buscar
              <input
                className={`mt-1 ${controlClassName}`}
                defaultValue={searchParams.get("q") ?? ""}
                onBlur={(event) => updateFilter("q", event.target.value.trim())}
              />
            </label>
            <label>
              Set
              <input
                className={`mt-1 ${controlClassName}`}
                defaultValue={searchParams.get("set") ?? ""}
                placeholder="slug"
                onBlur={(event) => updateFilter("set", event.target.value.trim())}
              />
            </label>
            <label>
              Condición
              <select
                className={`mt-1 ${controlClassName}`}
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
                className={`mt-1 ${controlClassName}`}
                value={searchParams.get("sort") ?? "recent"}
                onChange={(event) => updateFilter("sort", event.target.value)}
              >
                <option value="recent">Recientes</option>
                <option value="name">Nombre</option>
                <option value="estimatedValue">Valor estimado</option>
                <option value="quantity">Cantidad</option>
              </select>
            </label>
            <div className="flex items-end gap-2">
              <button
                type="button"
                className={buttonClassName(view === "grid" ? "primary" : "secondary", "min-h-11")}
                onClick={() => setView("grid")}
              >
                Grid
              </button>
              <button
                type="button"
                className={buttonClassName(view === "list" ? "primary" : "secondary", "min-h-11")}
                onClick={() => setView("list")}
              >
                List
              </button>
            </div>
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
              className={buttonClassName("danger", "mt-4")}
              disabled={pending}
              onClick={() => void bulkDelete()}
            >
              Eliminar seleccionados ({selected.length})
            </button>
          ) : null}

          <ul className={view === "grid" ? "mt-6 grid gap-3 sm:grid-cols-2" : "mt-6 grid gap-3"}>
            {page.items.map((item) => {
              const comparable = item.registeredCostClp != null && item.estimatedValueClp != null;
              const pct =
                comparable && item.registeredCostClp
                  ? Math.round(((item.estimatedValueClp! - item.registeredCostClp) / item.registeredCostClp) * 100)
                  : null;
              return (
                <li key={item.id} className="flex gap-3 rounded-[16px] border border-border bg-surface p-3">
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
                    <CardImage src={item.variant.card.imageUrl} alt="" className="h-24 w-[68px] shrink-0" />
                    <span className="min-w-0">
                      <span className="block font-medium">{item.variant.card.name}</span>
                      <span className="block text-sm text-text-muted">
                        {item.variant.card.setSlug} · {item.variant.card.number} · ×{item.quantity}
                      </span>
                      <span className="mt-1 block text-xs text-text-muted">
                        {item.condition} · {item.variant.language} · {item.variant.finish}
                      </span>
                      <span className="mt-2 block text-sm">
                        Costo: {item.registeredCostClp != null ? formatClp(item.registeredCostClp) : "—"}
                      </span>
                      <span className="block text-sm">
                        Valor estimado: {money(item.estimatedValueClp)}
                      </span>
                      {pct != null ? (
                        <span className={pct >= 0 ? "text-sm text-success" : "text-sm text-danger"}>
                          P/L: {pct >= 0 ? "+" : ""}
                          {pct}%
                        </span>
                      ) : (
                        <span className="text-sm text-text-muted">P/L: no comparable</span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
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
          <h2 className="text-xl font-medium tracking-tight">Progreso por set</h2>
          <ul className="mt-3 grid gap-3">
            {sets.map((row) => (
              <li key={row.setId}>
                <Link href={`/me/coleccion/sets/${row.setId}`} className="block rounded-[16px] border border-border bg-surface p-4">
                  <span className="font-medium">
                    {row.gameName} {row.setName}
                  </span>
                  <span className="mt-1 block text-sm text-text-muted">
                    {row.ownedUnique} / {row.total} · {row.percentage}% · {row.missing} faltantes · {row.extraCopies} duplicadas
                  </span>
                  <ProgressBar className="mt-2" value={row.percentage} label={`Progreso ${row.setName}`} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </PageMain>
  );
}

export default function CollectionPage() {
  return (
    <Suspense fallback={<PageMain><LoadingBlock /></PageMain>}>
      <CollectionHome />
    </Suspense>
  );
}
