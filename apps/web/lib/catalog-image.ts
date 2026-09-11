/** Hosts whose card art we may resize through the Next.js image optimizer. */
export const CATALOG_IMAGE_HOSTS = [
  "api.myl.cl",
  "tor.myl.cl",
  "cards.scryfall.io",
  "c1.scryfall.com",
  "images.pokemontcg.io",
] as const;

export type CatalogImageVariant = "grid" | "detail" | "thumb";

/** `sizes` hints so the optimizer does not download full Fénix/Scryfall PNGs on phones. */
export const CATALOG_IMAGE_SIZES: Record<CatalogImageVariant, string> = {
  grid: "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px",
  detail: "(max-width: 640px) 92vw, 280px",
  thumb: "72px",
};

export function catalogImageHost(src: string): string | null {
  try {
    return new URL(src).hostname;
  } catch {
    return null;
  }
}

/** True when `src` is https art from a known publisher CDN. */
export function canOptimizeCatalogImage(src: string): boolean {
  const host = catalogImageHost(src);
  return host != null && (CATALOG_IMAGE_HOSTS as readonly string[]).includes(host);
}
