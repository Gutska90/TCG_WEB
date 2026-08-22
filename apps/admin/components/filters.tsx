"use client";

import { useSearchParams } from "next/navigation";
import { type FormEvent, type ReactNode } from "react";

export function FilterBar({
  children,
  onSubmit,
}: {
  children: ReactNode;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="mb-4 flex flex-wrap items-end gap-3 text-sm">
      {children}
      <button type="submit" className="rounded bg-white px-3 py-2 text-neutral-950">
        Filtrar
      </button>
    </form>
  );
}

export function SearchInput({ name = "q" }: { name?: string }) {
  const params = useSearchParams() ?? new URLSearchParams();
  return (
    <label className="flex flex-col gap-1">
      Buscar
      <input
        name={name}
        defaultValue={params.get(name) ?? ""}
        className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
      />
    </label>
  );
}

export function Pager({ page, pageSize, total }: { page: number; pageSize: number; total: number }) {
  const params = useSearchParams() ?? new URLSearchParams();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  function href(next: number) {
    const q = new URLSearchParams(params.toString());
    q.set("page", String(next));
    return `?${q.toString()}`;
  }
  return (
    <p className="mt-4 flex gap-3 text-sm text-neutral-400">
      {page > 1 ? <a href={href(page - 1)}>Anterior</a> : null}
      <span>
        Página {page} de {pages} · {total} filas
      </span>
      {page < pages ? <a href={href(page + 1)}>Siguiente</a> : null}
    </p>
  );
}
