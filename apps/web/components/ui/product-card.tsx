import { cx, gameAccentForSlug } from "@tcg/ui";
import Link from "next/link";
import { Price } from "./price";

export function CardImage({
  src,
  alt,
  className,
  name,
  gameSlug,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  name?: string;
  gameSlug?: string;
}) {
  const accent = gameSlug ? gameAccentForSlug(gameSlug) : undefined;
  const initials = (name ?? alt).replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, "").slice(0, 2).toUpperCase() || "CG";
  return (
    <div
      className={cx(
        "flex aspect-[63/88] items-center justify-center overflow-hidden rounded-[12px] bg-surface-elevated",
        className,
      )}
      style={accent && !src ? { background: `${accent}22` } : undefined}
    >
      {src ? (
        // Catalog source URL; we do not host publisher art.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="h-full w-full object-contain" />
      ) : (
        <span className="px-2 text-center text-sm font-medium tracking-tight text-text-muted">{initials}</span>
      )}
    </div>
  );
}

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
  return (
    <Link
      href={href}
      className="elevate-hover block rounded-[16px] border border-border bg-surface p-3"
      style={accent ? { borderColor: `${accent}55` } : undefined}
    >
      <CardImage src={imageUrl} alt="" name={name} gameSlug={gameSlug} />
      <p className="mt-3 font-medium tracking-tight text-text">{name}</p>
      {gameName ? <span className="sr-only">{gameName}</span> : null}
      <p className="mt-1 text-sm text-text-muted">
        {[setName, number].filter(Boolean).join(" · ")}
      </p>
      {gameName ? <p className="text-xs text-text-muted">{gameName}</p> : null}
      {priceClp != null ? <Price className="mt-2" value={priceClp} prefix="Desde" size="sm" /> : null}
      {meta ? <p className="mt-1 text-xs text-text-muted">{meta}</p> : null}
    </Link>
  );
}
