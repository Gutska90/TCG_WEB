"use client";

import type { GameView } from "@tcg/types";
import { Filter } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { SearchCardsInput } from "../lib/search";
import { SearchForm } from "./search-form";
import { Button } from "./ui/button";
import { Sheet } from "./ui/sheet";

export function SearchLayout({
  games,
  values,
  children,
}: {
  games: GameView[];
  values: SearchCardsInput;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start lg:gap-8">
      <aside className="hidden lg:block">
        <div className="sticky top-28 rounded-[16px] border border-border bg-surface p-4">
          <h2 className="text-sm font-medium">Filtros</h2>
          <div className="mt-3">
            <SearchForm games={games} values={values} />
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
              Filtros
            </Button>
          </div>
        </div>
        {children}
      </div>
      <Sheet open={open} title="Filtros" onClose={() => setOpen(false)}>
        <SearchForm games={games} values={values} />
      </Sheet>
    </div>
  );
}
