"use client";

import type { GameFiltersView, GameView } from "@tcg/types";
import { Filter } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { SearchCardsInput } from "../lib/search";
import { SearchForm } from "./search-form";
import { Button } from "./ui/button";
import { Sheet } from "./ui/sheet";

export function SearchLayout({
  games,
  values,
  filters = null,
  children,
}: {
  games: GameView[];
  values: SearchCardsInput;
  filters?: GameFiltersView | null;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const count = activeCount(values);

  return (
    <div className="lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start lg:gap-8">
      <aside className="hidden lg:block">
        <div className="sticky top-28 rounded-[16px] border border-border bg-surface p-4">
          <h2 className="text-sm font-medium">Filtros</h2>
          <div className="mt-3">
            <SearchForm games={games} values={values} initialMeta={filters} />
          </div>
        </div>
      </aside>
      <div>
        <div className="sticky top-[3.25rem] z-20 -mx-4 mb-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm lg:hidden">
          <div className="flex gap-2">
            <div className="min-w-0 flex-1">
              <SearchForm compact values={values} />
            </div>
            <Button variant="secondary" onClick={() => setOpen(true)}>
              <Filter className="h-4 w-4" aria-hidden />
              Filtros{count ? ` (${count})` : ""}
            </Button>
          </div>
        </div>
        {children}
      </div>
      <Sheet open={open} title="Filtros" onClose={() => setOpen(false)}>
        <SearchForm games={games} values={values} initialMeta={filters} />
      </Sheet>
    </div>
  );
}

function activeCount(values: SearchCardsInput): number {
  let n = 0;
  if (values.game) n += 1;
  if (values.set) n += 1;
  if (values.rarity) n += 1;
  if (values.supertype) n += 1;
  if (values.language) n += 1;
  if (values.finish) n += 1;
  if (values.condition) n += 1;
  if (values.priceMin || values.priceMax) n += 1;
  n += Object.keys(values.attrs ?? {}).length;
  return n;
}
