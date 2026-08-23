import Link from "next/link";

export default function NotFound() {
  return (
    <main id="contenido" className="mx-auto max-w-lg px-6 py-16">
      <h1 className="text-2xl font-semibold">No encontrado</h1>
      <p className="mt-2 text-text-muted">Esta página no existe o ya no está disponible.</p>
      <p className="mt-6 flex gap-4 text-sm">
        <Link href="/" className="underline">
          Inicio
        </Link>
        <Link href="/buscar" className="underline">
          Buscar
        </Link>
        <Link href="/ayuda" className="underline">
          Ayuda
        </Link>
      </p>
    </main>
  );
}
