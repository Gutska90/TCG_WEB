"use client";

import Image from "next/image";
import { useState } from "react";
import { cx, gameAccentForSlug } from "@tcg/ui";
import {
  CATALOG_IMAGE_SIZES,
  canOptimizeCatalogImage,
  type CatalogImageVariant,
} from "../../lib/catalog-image";

function initialsFrom(name: string): string {
  return name.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, "").slice(0, 2).toUpperCase() || "CG";
}

/**
 * Official catalog art (`Card.imageUrl`). We do not host publisher files.
 * Grid/thumb: lazy + resized WebP. Detail: high fetch priority for LCP.
 * If the optimizer cannot fetch a CDN (hotlink/403), we fall back to the original URL
 * so the ficha still shows art. Unknown hosts skip the optimizer entirely.
 */
export function CardImage({
  src,
  alt,
  className,
  name,
  gameSlug,
  variant = "grid",
  priority = false,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  name?: string;
  gameSlug?: string;
  variant?: CatalogImageVariant;
  /** Set on the ficha hero so the first paint is not blocked by below-the-fold grid art. */
  priority?: boolean;
}) {
  const [nativeFallback, setNativeFallback] = useState(false);
  const [failed, setFailed] = useState(false);
  const accent = gameSlug ? gameAccentForSlug(gameSlug) : undefined;
  const initials = initialsFrom(name ?? alt);
  const showImg = Boolean(src) && !failed;
  const optimize = Boolean(src) && canOptimizeCatalogImage(src ?? "") && !nativeFallback;

  return (
    <div
      className={cx(
        "relative flex aspect-[63/88] items-center justify-center overflow-hidden rounded-[12px] bg-surface-elevated",
        className,
      )}
      style={accent && !showImg ? { background: `${accent}22` } : undefined}
    >
      {showImg && src ? (
        optimize ? (
          <Image
            src={src}
            alt={alt || name || ""}
            fill
            sizes={CATALOG_IMAGE_SIZES[variant]}
            className="object-contain"
            quality={72}
            priority={priority}
            onError={() => setNativeFallback(true)}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- host is not in the optimizer allowlist, or optimizer failed
          <img
            src={src}
            alt={alt || name || ""}
            className="h-full w-full object-contain"
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            {...(priority ? { fetchPriority: "high" as const } : {})}
            onError={() => setFailed(true)}
          />
        )
      ) : (
        <span className="px-2 text-center text-sm font-medium tracking-tight text-text-muted">{initials}</span>
      )}
    </div>
  );
}
