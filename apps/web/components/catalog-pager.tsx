import Link from "next/link";

export function CatalogPager({
  page,
  pageSize,
  total,
  hrefForPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  hrefForPage: (page: number) => string;
}) {
  const last = Math.max(1, Math.ceil(total / pageSize));
  if (last <= 1) {
    return null;
  }
  return (
    <nav className="mt-8 flex items-center gap-4 text-sm">
      {page > 1 ? (
        <Link href={hrefForPage(page - 1)} className="underline">
          Anterior
        </Link>
      ) : (
        <span className="text-neutral-400">Anterior</span>
      )}
      <span>
        {page} / {last}
      </span>
      {page < last ? (
        <Link href={hrefForPage(page + 1)} className="underline">
          Siguiente
        </Link>
      ) : (
        <span className="text-neutral-400">Siguiente</span>
      )}
    </nav>
  );
}
