"use client";

import Link from "next/link";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main id="contenido" className="mx-auto max-w-lg px-6 py-16">
      <p className="text-sm font-medium text-text-muted">Error 500</p>
      <h1 className="mt-2 text-2xl font-semibold">Algo falló</h1>
      <p className="mt-3 text-text-muted">El servicio tuvo un problema. Puedes reintentar o volver al inicio.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" className="inline-flex min-h-11 items-center rounded-[12px] bg-primary px-4 py-2 text-sm font-medium text-white" onClick={reset}>
          Reintentar
        </button>
        <Link href="/" className="inline-flex min-h-11 items-center rounded-[12px] border border-border bg-surface px-4 py-2 text-sm">
          Ir al inicio
        </Link>
        <Link href="/ayuda" className="inline-flex min-h-11 items-center rounded-[12px] border border-border bg-surface px-4 py-2 text-sm">
          Ayuda
        </Link>
      </div>
    </main>
  );
}
