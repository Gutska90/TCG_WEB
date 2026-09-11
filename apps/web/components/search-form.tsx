"use client";

import { CARD_CONDITIONS, CARD_CONDITION_LABELS, CARD_FINISHES, CARD_FINISH_LABELS, CARD_LANGUAGES, CARD_LANGUAGE_LABELS, isFilterVisible } from "@tcg/config";
import type { GameFilterView, GameFiltersView, GameView } from "@tcg/types";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { omitSearchFilter, searchCardsHref, type SearchCardsInput } from "../lib/search";
import { controlClassName } from "./ui/input";
import { SearchSuggest } from "./search-suggest";
import { buttonClassName } from "./ui/button-styles";

export function SearchForm({
  games,
  values,
  compact = false,
  initialMeta = null,
  action = "/buscar",
  lockGame = false,
  lockSet = false,
  inputId = "header-q",
  defaultHasListings = false,
}: {
  games?: GameView[];
  values?: SearchCardsInput;
  compact?: boolean;
  initialMeta?: GameFiltersView | null;
  action?: string;
  lockGame?: boolean;
  lockSet?: boolean;
  inputId?: string;
  /** Header/home: buyers land on En venta. Compact filters keep the current toggle. */
  defaultHasListings?: boolean;
}) {
  if (compact) {
    const onSale = values?.hasListings === true || defaultHasListings;
    return (
      <form action={action} method="get" className="w-full min-w-0">
        {lockGame && values?.game ? <input type="hidden" name="game" value={values.game} /> : null}
        {lockSet && values?.set ? <input type="hidden" name="set" value={values.set} /> : null}
        {onSale ? <input type="hidden" name="hasListings" value="true" /> : null}
        <label className="sr-only" htmlFor={inputId}>
          Buscar cartas
        </label>
        <SearchSuggest
          id={inputId}
          name="q"
          defaultValue={values?.q ?? ""}
          placeholder="Buscar cartas..."
          game={lockGame ? values?.game : undefined}
          set={lockSet ? values?.set : undefined}
        />
      </form>
    );
  }

  return (
    <FullSearchForm
      games={games ?? []}
      values={values ?? {}}
      initialMeta={initialMeta}
      action={action}
      lockGame={lockGame}
      lockSet={lockSet}
    />
  );
}

function FullSearchForm({
  games,
  values,
  initialMeta,
  action,
  lockGame,
  lockSet,
}: {
  games: GameView[];
  values: SearchCardsInput;
  initialMeta: GameFiltersView | null;
  action: string;
  lockGame: boolean;
  lockSet: boolean;
}) {
  const [game, setGame] = useState(values.game ?? "");
  const [meta, setMeta] = useState<GameFiltersView | null>(initialMeta);
  const [selected, setSelected] = useState<Record<string, string[]>>(selectedFromValues(values));

  useEffect(() => {
    if (!game) {
      setMeta(null);
      return;
    }
    if (initialMeta && game === initialMeta.game.slug) {
      setMeta(initialMeta);
      return;
    }
    setMeta(null);
    let cancelled = false;
    void api<GameFiltersView>(`/v1/games/${game}/filters`)
      .then((row) => {
        if (!cancelled) setMeta(row);
      })
      .catch(() => {
        if (!cancelled) setMeta(null);
      });
    return () => {
      cancelled = true;
    };
  }, [game, initialMeta]);

  const cardFilters = useMemo(
    () =>
      (meta?.filters ?? []).filter(
        (filter) =>
          filter.group === "card" &&
          !(lockSet && filter.key === "set") &&
          isFilterVisible(toDef(filter), selected),
      ),
    [meta, selected, lockSet],
  );
  const marketFilters = useMemo(
    () => (meta?.filters ?? []).filter((filter) => filter.group === "marketplace"),
    [meta],
  );

  return (
    <form action={action} method="get" className="grid gap-4">
      {values.hasListings ? <input type="hidden" name="hasListings" value="true" /> : null}
      <label className="text-sm">
        Nombre o número
        <SearchSuggest
          id="q"
          name="q"
          defaultValue={values.q ?? ""}
          placeholder="Nombre, número o set"
          game={lockGame ? values.game : game}
          set={lockSet ? values.set : undefined}
        />
      </label>
      {lockGame && values.game ? <input type="hidden" name="game" value={values.game} /> : null}
      {lockSet && values.set ? <input type="hidden" name="set" value={values.set} /> : null}
      {lockGame ? null : (
        <label className="text-sm">
          Juego
          <select
            name="game"
            value={game}
            onChange={(event) => {
              setGame(event.target.value);
              setSelected({});
            }}
            className={`mt-1 ${controlClassName}`}
          >
            <option value="">Todos</option>
            {games.map((row) => (
              <option key={row.id} value={row.slug}>
                {row.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {meta ? (
        <>
          {meta.support === "PARTIAL" ? (
            <p className="text-xs text-text-muted">Filtros parciales: solo datos presentes en el catálogo.</p>
          ) : null}
          <fieldset className="grid gap-3">
            <legend className="text-xs font-medium tracking-wide text-text-muted uppercase">Filtros de carta</legend>
            {cardFilters
              .filter((filter) => (filter.tier ?? "PRIMARY") === "PRIMARY")
              .map((filter) => (
                <FilterControl
                  key={filter.key}
                  filter={filter}
                  values={values}
                  selected={selected}
                  onSelected={setSelected}
                />
              ))}
          </fieldset>
          {cardFilters.some((filter) => filter.tier === "ADVANCED") ? (
            <details className="grid gap-3">
              <summary className="cursor-pointer text-sm">Más filtros</summary>
              <div className="mt-3 grid gap-3">
                {cardFilters
                  .filter((filter) => filter.tier === "ADVANCED")
                  .map((filter) => (
                    <FilterControl
                      key={filter.key}
                      filter={filter}
                      values={values}
                      selected={selected}
                      onSelected={setSelected}
                    />
                  ))}
              </div>
            </details>
          ) : null}
          <fieldset className="grid gap-3">
            <legend className="text-xs font-medium tracking-wide text-text-muted uppercase">Compra</legend>
            {marketFilters
              .filter((filter) => (filter.tier ?? "PRIMARY") === "PRIMARY")
              .map((filter) => (
                <FilterControl
                  key={filter.key}
                  filter={filter}
                  values={values}
                  selected={selected}
                  onSelected={setSelected}
                />
              ))}
            {marketFilters.some((filter) => filter.tier === "ADVANCED") ? (
              <details>
                <summary className="cursor-pointer text-sm">Más filtros de compra</summary>
                <div className="mt-3 grid gap-3">
                  {marketFilters
                    .filter((filter) => filter.tier === "ADVANCED")
                    .map((filter) => (
                      <FilterControl
                        key={filter.key}
                        filter={filter}
                        values={values}
                        selected={selected}
                        onSelected={setSelected}
                      />
                    ))}
                </div>
              </details>
            ) : null}
          </fieldset>
        </>
      ) : (
        <GenericFallback values={values} lockSet={lockSet} />
      )}
      <SortControl values={values} filters={meta?.filters ?? []} />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={buttonClassName("primary")}>
          Buscar
        </button>
        <Link
          href={lockGame || lockSet ? action : game ? `/buscar?game=${encodeURIComponent(game)}` : "/buscar"}
          className="text-sm underline"
        >
          Limpiar todos
        </Link>
      </div>
    </form>
  );
}

function GenericFallback({ values, lockSet }: { values: SearchCardsInput; lockSet: boolean }) {
  return (
    <>
      {lockSet ? null : (
        <label className="text-sm">
          Expansión
          <input name="set" defaultValue={values.set ?? ""} className={`mt-1 ${controlClassName}`} placeholder="Nombre o código" />
        </label>
      )}
      <label className="text-sm">
        Rareza
        <input name="rarity" defaultValue={values.rarity ?? ""} className={`mt-1 ${controlClassName}`} />
      </label>
      <PriceFields values={values} />
      <details>
        <summary className="cursor-pointer text-sm">Más filtros</summary>
        <div className="mt-3 grid gap-3">
          <LanguageFinish values={values} />
        </div>
      </details>
    </>
  );
}

function FilterControl({
  filter,
  values,
  selected,
  onSelected,
}: {
  filter: GameFilterView;
  values: SearchCardsInput;
  selected: Record<string, string[]>;
  onSelected: (next: Record<string, string[]>) => void;
}) {
  if (filter.key === "language" || filter.key === "finish") {
    return <LanguageFinish values={values} only={filter.key} />;
  }
  if (filter.key === "condition") {
    return (
      <label className="text-sm">
        {filter.label}
        <select name="condition" defaultValue={values.condition ?? ""} className={`mt-1 ${controlClassName}`}>
          <option value="">Todas</option>
          {CARD_CONDITIONS.map((condition) => (
            <option key={condition} value={condition}>
              {CARD_CONDITION_LABELS[condition]}
            </option>
          ))}
        </select>
      </label>
    );
  }
  if (filter.key === "hasListings") {
    return null;
  }
  if (filter.key === "price" || (filter.range && filter.key === "price")) {
    return <PriceFields values={values} />;
  }
  if (filter.type === "NUMBER_RANGE") {
    const minName = filter.key === "price" ? "priceMin" : `attr.${filter.key}Min`;
    const maxName = filter.key === "price" ? "priceMax" : `attr.${filter.key}Max`;
    const minValue = filter.key === "price" ? values.priceMin : values.attrs?.[`${filter.key}Min`]?.[0];
    const maxValue = filter.key === "price" ? values.priceMax : values.attrs?.[`${filter.key}Max`]?.[0];
    return (
      <div className="grid grid-cols-2 gap-2">
        <label className="text-sm">
          {filter.label} mín.
          <input name={minName} type="number" defaultValue={minValue ?? ""} className={`mt-1 ${controlClassName}`} />
        </label>
        <label className="text-sm">
          {filter.label} máx.
          <input name={maxName} type="number" defaultValue={maxValue ?? ""} className={`mt-1 ${controlClassName}`} />
        </label>
      </div>
    );
  }
  const name = inputName(filter.key);
  const current = selected[filter.key] ?? currentValues(values, filter.key);
  const options = optionsFor(filter);
  if (filter.type === "MULTI_SELECT") {
    return (
      <fieldset className="text-sm">
        <legend>{filter.label}</legend>
        <div className="mt-2 grid gap-1">
          {options.map((option) => (
            <label key={option.value} className="flex items-center gap-2">
              <input
                type="checkbox"
                name={name}
                value={option.value}
                defaultChecked={current.includes(option.value)}
                onChange={(event) => {
                  const next = new Set(current);
                  if (event.target.checked) next.add(option.value);
                  else next.delete(option.value);
                  onSelected({ ...selected, [filter.key]: [...next] });
                }}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
    );
  }
  return (
    <label className="text-sm">
      {filter.label}
      <select
        name={name}
        defaultValue={current[0] ?? ""}
        className={`mt-1 ${controlClassName}`}
        onChange={(event) => onSelected({ ...selected, [filter.key]: event.target.value ? [event.target.value] : [] })}
      >
        <option value="">Todos</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function LanguageFinish({ values, only }: { values: SearchCardsInput; only?: "language" | "finish" }) {
  return (
    <>
      {only !== "finish" ? (
        <label className="text-sm">
          Idioma
          <select name="language" defaultValue={values.language ?? ""} className={`mt-1 ${controlClassName}`}>
            <option value="">Todos</option>
            {CARD_LANGUAGES.map((language) => (
              <option key={language} value={language}>
                {CARD_LANGUAGE_LABELS[language]}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {only !== "language" ? (
        <label className="text-sm">
          Acabado
          <select name="finish" defaultValue={values.finish ?? ""} className={`mt-1 ${controlClassName}`}>
            <option value="">Todos</option>
            {CARD_FINISHES.map((finish) => (
              <option key={finish} value={finish}>
                {CARD_FINISH_LABELS[finish]}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </>
  );
}

function PriceFields({ values }: { values: SearchCardsInput }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <label className="text-sm">
        Precio mín. CLP
        <input name="priceMin" type="number" min={1} defaultValue={values.priceMin ?? ""} className={`mt-1 ${controlClassName}`} />
      </label>
      <label className="text-sm">
        Precio máx. CLP
        <input name="priceMax" type="number" min={1} defaultValue={values.priceMax ?? ""} className={`mt-1 ${controlClassName}`} />
      </label>
    </div>
  );
}

function SortControl({ values, filters }: { values: SearchCardsInput; filters: GameFilterView[] }) {
  const extra = filters.filter((filter) => filter.range && filter.key !== "price");
  return (
    <label className="text-sm">
      Orden
      <select name="sort" defaultValue={values.sort ?? "relevance"} className={`mt-1 ${controlClassName}`}>
        <option value="relevance">Relevancia</option>
        <option value="nameAsc">Nombre A-Z</option>
        <option value="nameDesc">Nombre Z-A</option>
        <option value="releasedAt">Novedad del set</option>
        <option value="price">Precio menor</option>
        {extra.map((filter) => (
          <option key={filter.key} value={filter.key}>
            {filter.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function inputName(key: string): string {
  if (["set", "rarity", "supertype", "language", "finish", "condition"].includes(key)) return key;
  return `attr.${key}`;
}

function currentValues(values: SearchCardsInput, key: string): string[] {
  if (key === "set" && values.set) return [values.set];
  if (key === "rarity" && values.rarity) return [values.rarity];
  if (key === "supertype" && values.supertype) return [values.supertype];
  return values.attrs?.[key] ?? [];
}

function selectedFromValues(values: SearchCardsInput): Record<string, string[]> {
  const selected: Record<string, string[]> = { ...(values.attrs ?? {}) };
  if (values.set) selected.set = [values.set];
  if (values.rarity) selected.rarity = [values.rarity];
  if (values.supertype) selected.supertype = [values.supertype];
  return selected;
}

function optionsFor(filter: GameFilterView) {
  return filter.options;
}

function toDef(filter: GameFilterView) {
  return {
    key: filter.key,
    label: filter.label,
    group: filter.group,
    type: filter.type,
    source: { kind: "json" as const, path: filter.key },
    order: filter.order,
    visibleWhen: filter.visibleWhen,
    tier: filter.tier,
  };
}

export function SearchFilterChips({
  values,
  pathname = "/buscar",
  lockedKeys = [],
  games = [],
  setLabel,
}: {
  values: SearchCardsInput;
  pathname?: string;
  lockedKeys?: string[];
  games?: GameView[];
  setLabel?: string;
}) {
  const locked = new Set(lockedKeys);
  const chips: Array<{ key: string; label: string }> = [];
  if (values.game && !locked.has("game")) {
    chips.push({ key: "game", label: games.find((game) => game.slug === values.game)?.name ?? values.game });
  }
  if (values.set && !locked.has("set")) chips.push({ key: "set", label: setLabel ?? values.set });
  if (values.rarity) chips.push({ key: "rarity", label: values.rarity });
  if (values.supertype) chips.push({ key: "supertype", label: values.supertype });
  if (values.language) chips.push({ key: "language", label: CARD_LANGUAGE_LABELS[values.language as keyof typeof CARD_LANGUAGE_LABELS] ?? values.language });
  if (values.finish) chips.push({ key: "finish", label: CARD_FINISH_LABELS[values.finish as keyof typeof CARD_FINISH_LABELS] ?? values.finish });
  if (values.condition) chips.push({ key: "condition", label: CARD_CONDITION_LABELS[values.condition as keyof typeof CARD_CONDITION_LABELS] ?? values.condition });
  if (values.hasListings) chips.push({ key: "hasListings", label: "En venta" });
  if (values.priceMin || values.priceMax) chips.push({ key: "price", label: "Precio" });
  for (const [key, items] of Object.entries(values.attrs ?? {})) {
    chips.push({ key, label: `${key}: ${items.join(", ")}` });
  }
  if (chips.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <li key={chip.key}>
          <Link
            href={searchCardsHref(omitSearchFilter(values, chip.key), pathname)}
            className="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs"
          >
            {chip.label} ×
          </Link>
        </li>
      ))}
    </ul>
  );
}
