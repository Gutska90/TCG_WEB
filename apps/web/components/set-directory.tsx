"use client";

import { MYL_SET_ERA_LABELS, MYL_SET_ERAS, mylSetEra } from "@tcg/config";
import type { SetSummaryView } from "@tcg/types";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CardImage } from "./ui/product-card";
import { controlClassName } from "./ui/input";

export function SetDirectory({
  gameSlug,
  gameName,
  sets,
}: {
  gameSlug: string;
  gameName: string;
  sets: SetSummaryView[];
}) {
  const [q, setQ] = useState("");
  const grouped = useMemo(() => {
    const term = q.trim().toLowerCase();
    const filtered = term
      ? sets.filter((set) => `${set.name} ${set.code} ${set.slug}`.toLowerCase().includes(term))
      : sets;
    if (gameSlug !== "mitos-y-leyendas") {
      return [{ era: "other" as const, label: gameName, items: filtered }];
    }
    return MYL_SET_ERAS.map((era) => ({
      era,
      label: MYL_SET_ERA_LABELS[era],
      items: filtered.filter((set) => mylSetEra(set.slug) === era),
    })).filter((group) => group.items.length > 0);
  }, [gameName, gameSlug, q, sets]);

  return (
    <div className="mt-8">
      <label className="text-sm">
        Buscar edición
        <input
          className={`mt-1 max-w-md ${controlClassName}`}
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Águila, Espada, Helénica…"
        />
      </label>
      {grouped.map((group) => (
        <section key={group.era} className="mt-8">
          {gameSlug === "mitos-y-leyendas" || grouped.length > 1 ? (
            <h2 className="text-xl font-medium tracking-tight">{group.label}</h2>
          ) : null}
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {group.items.map((set) => (
              <li key={set.id}>
                <SetTile gameSlug={gameSlug} set={set} />
              </li>
            ))}
          </ul>
        </section>
      ))}
      {grouped.every((group) => group.items.length === 0) ? (
        <p className="mt-6 text-sm text-text-muted">No hay ediciones con ese nombre.</p>
      ) : null}
    </div>
  );
}

function SetTile({ gameSlug, set }: { gameSlug: string; set: SetSummaryView }) {
  const arts = set.previewImageUrls?.length ? set.previewImageUrls : set.imageUrl ? [set.imageUrl] : [];
  return (
    <Link href={`/${gameSlug}/${set.slug}`} className="elevate-hover block min-w-0 rounded-[16px] border border-border bg-surface p-3">
      {arts.length > 0 ? (
        <div className={`grid gap-1 ${arts.length > 1 ? "grid-cols-3" : "grid-cols-1"}`}>
          {arts.slice(0, 3).map((src) => (
            <CardImage key={src} src={src} alt={set.name} name={set.name} gameSlug={gameSlug} variant="thumb" />
          ))}
        </div>
      ) : (
        <div className="flex aspect-[16/10] items-center justify-center rounded-[12px] bg-surface-elevated text-sm text-text-muted">
          {set.code}
        </div>
      )}
      <p className="mt-3 font-medium">{set.name}</p>
      <p className="text-sm text-text-muted">
        {set.code} · {set.cardCount} cartas
      </p>
    </Link>
  );
}
