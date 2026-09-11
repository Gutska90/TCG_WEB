"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Paginated, SearchCardView } from "@tcg/types";
import { SearchInput } from "./ui/search-input";

/**
 * Typeahead over GET /v1/search/cards (no extra endpoint).
 * Keyboard: arrows move, Enter goes to the highlighted ficha or submits the form.
 * Pointer down on a hit prevents input blur so the click is not swallowed.
 */
export function SearchSuggest({
  id,
  name = "q",
  defaultValue = "",
  placeholder,
  game,
  set,
}: {
  id: string;
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  game?: string;
  set?: string;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState(defaultValue);
  const [hits, setHits] = useState<SearchCardView[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    setQ(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setHits([]);
      setOpen(false);
      return;
    }
    const handle = window.setTimeout(() => {
      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;
      const params = new URLSearchParams({ q: term, pageSize: "8", sort: "relevance" });
      if (game) params.set("game", game);
      if (set) params.set("set", set);
      void fetch(`/v1/search/cards?${params}`, { signal: controller.signal })
        .then((res) => (res.ok ? res.json() : null))
        .then((page: Paginated<SearchCardView> | null) => {
          if (!page) return;
          setHits(page.items);
          setActive(0);
          setOpen(page.items.length > 0);
        })
        .catch(() => undefined);
    }, 220);
    return () => window.clearTimeout(handle);
  }, [q, game, set]);

  function hrefFor(card: SearchCardView): string {
    return `/${card.gameSlug}/${card.setSlug}/${card.slug}`;
  }

  return (
    <div ref={rootRef} className="relative w-full min-w-0">
      <SearchInput
        id={id}
        name={name}
        value={q}
        autoComplete="off"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={open}
        placeholder={placeholder}
        onChange={(event) => {
          setQ(event.target.value);
        }}
        onFocus={() => {
          if (hits.length) setOpen(true);
        }}
        onBlur={(event) => {
          const next = event.relatedTarget;
          if (next instanceof Node && rootRef.current?.contains(next)) return;
          setOpen(false);
        }}
        onKeyDown={(event) => {
          if (!open || hits.length === 0) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((index) => (index + 1) % hits.length);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((index) => (index - 1 + hits.length) % hits.length);
          } else if (event.key === "Escape") {
            setOpen(false);
          } else if (event.key === "Enter" && hits[active]) {
            event.preventDefault();
            window.location.assign(hrefFor(hits[active]));
          }
        }}
      />
      {open && hits.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-40 mt-1 max-h-80 w-full overflow-auto rounded-[12px] border border-border bg-surface p-1 shadow-[var(--shadow)]"
        >
          {hits.map((card, index) => (
            <li key={card.id} role="option" aria-selected={index === active}>
              <a
                href={hrefFor(card)}
                tabIndex={-1}
                onPointerDown={(event) => event.preventDefault()}
                onMouseDown={(event) => event.preventDefault()}
                className={
                  index === active
                    ? "block rounded-[10px] bg-surface-elevated px-3 py-2 text-sm"
                    : "block rounded-[10px] px-3 py-2 text-sm hover:bg-surface-elevated"
                }
              >
                <span className="font-medium">{card.name}</span>
                <span className="mt-0.5 block truncate text-xs text-text-muted">
                  {card.setName} · {card.number} · {card.gameName}
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
