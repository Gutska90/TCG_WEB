import { cx, gameAccentForSlug } from "@tcg/ui";
import Link from "next/link";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function GameTile({
  href,
  name,
  slug,
  blurb,
}: {
  href: string;
  name: string;
  slug: string;
  blurb: string;
}) {
  const accent = gameAccentForSlug(slug);
  return (
    <Link
      href={href}
      className={cx("elevate-hover block min-w-0 rounded-[16px] border border-border bg-surface p-4")}
      style={accent ? { borderTopWidth: 3, borderTopColor: accent } : undefined}
    >
      <span
        className="flex h-10 w-10 items-center justify-center rounded-[12px] text-sm font-semibold text-white"
        style={{ background: accent ?? "#64748B" }}
        aria-hidden
      >
        {initials(name)}
      </span>
      <p className="mt-3 text-lg font-medium">{name}</p>
      <p className="mt-1 text-sm text-text-muted">{blurb}</p>
    </Link>
  );
}
