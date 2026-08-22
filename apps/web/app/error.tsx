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
      <h1 className="text-2xl font-semibold">Algo falló</h1>
      <p className="mt-3 text-neutral-700">El servicio tuvo un problema. Puedes reintentar o volver al inicio.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" className="rounded bg-neutral-900 px-4 py-2 text-sm text-white" onClick={reset}>
          Reintentar
        </button>
        <Link href="/" className="rounded border px-4 py-2 text-sm">
          Ir al inicio
        </Link>
        <Link href="/ayuda" className="rounded border px-4 py-2 text-sm">
          Ayuda
        </Link>
      </div>
    </main>
  );
}
