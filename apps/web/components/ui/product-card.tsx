import { gameAccentForSlug } from "@tcg/ui";
import Link from "next/link";
import { Price } from "./price";
import { CardImage } from "./card-image";

export { CardImage } from "./card-image";

/** Shared catalog mosaic: two columns on phones so PE/PB grids do not stack as a single slow column. */
export const CATALOG_CARD_GRID = "mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3";

/**
 * Compact listing/search tile. Images stay lazy via `CardImage`; the card itself
 * uses `content-visibility` so off-screen rows skip layout until scrolled.
 */
export function ProductCard({
  href,
  name,
  setName,
  number,
  gameName,
  imageUrl,
  priceClp,
  meta,
  gameSlug,
}: {
  href: string;
  name: string;
  setName?: string;
  number?: string;
  gameName?: string;
  imageUrl?: string | null;
  priceClp?: number | null;
  meta?: string;
  gameSlug?: string;
}) {
  const accent = gameSlug ? gameAccentForSlug(gameSlug) : undefined;
  const alt = [name, setName, number].filter(Boolean).join(" · ");
  return (
    <Link
      href={href}
      className="catalog-card elevate-hover block min-w-0 rounded-[16px] border border-border bg-surface p-2 sm:p-3"
      style={accent ? { borderColor: `${accent}55` } : undefined}
    >
      <div className="relative">
        <CardImage src={imageUrl} alt={alt} name={name} gameSlug={gameSlug} variant="grid" />
        {number || meta ? (
          <p className="absolute bottom-1 left-1 right-1 truncate rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white sm:text-xs">
            {[number, meta].filter(Boolean).join(" · ")}
          </p>
        ) : null}
      </div>
      <p className="mt-2 line-clamp-2 font-medium tracking-tight text-text sm:mt-3">{name}</p>
      {gameName ? <span className="sr-only">{gameName}</span> : null}
      <p className="mt-1 truncate text-xs font-medium text-text">
        {[number, meta].filter(Boolean).join(" · ")}
      </p>
      {setName ? <p className="truncate text-sm text-text-muted">{setName}</p> : null}
      {gameName ? <p className="truncate text-xs text-text-muted">{gameName}</p> : null}
      {priceClp != null ? <Price className="mt-2" value={priceClp} prefix="Desde" size="sm" /> : null}
    </Link>
  );
}
