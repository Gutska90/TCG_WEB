import Link from "next/link";
import { cx } from "@tcg/ui";
import { searchCardsHref, type SearchCardsInput } from "../lib/search";

/** Catalog vs marketplace, using existing `hasListings` (no new API). */
export function CatalogModeToggle({
  values,
  pathname = "/buscar",
}: {
  values: SearchCardsInput;
  pathname?: string;
}) {
  const catalogHref = searchCardsHref({ ...values, hasListings: undefined, page: 1 }, pathname);
  const saleHref = searchCardsHref({ ...values, hasListings: true, page: 1, sort: values.sort ?? "price" }, pathname);
  const onSale = values.hasListings === true;

  return (
    <div className="inline-flex rounded-[12px] border border-border p-1 text-sm" role="group" aria-label="Tipo de resultados">
      <Link
        href={catalogHref}
        className={cx(
          "rounded-[10px] px-3 py-1.5",
          !onSale ? "bg-surface-elevated font-medium text-text" : "text-text-muted hover:text-text",
        )}
      >
        Catálogo
      </Link>
      <Link
        href={saleHref}
        className={cx(
          "rounded-[10px] px-3 py-1.5",
          onSale ? "bg-surface-elevated font-medium text-text" : "text-text-muted hover:text-text",
        )}
      >
        En venta
      </Link>
    </div>
  );
}
