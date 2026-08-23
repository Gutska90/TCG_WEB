"use client";

import { cx } from "@tcg/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/me", label: "Perfil" },
  { href: "/me/coleccion", label: "Colección" },
  { href: "/me/wishlist", label: "Wishlist" },
  { href: "/me/compras", label: "Compras" },
  { href: "/me/ventas", label: "Ventas" },
  { href: "/me/publicaciones", label: "Publicaciones" },
  { href: "/me/seguridad", label: "Seguridad" },
] as const;

export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Cuenta" className="mb-6 lg:mb-0">
      <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
        {LINKS.map((link) => {
          const active = pathname === link.href || (link.href !== "/me" && pathname.startsWith(link.href));
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                className={cx(
                  "block min-h-11 shrink-0 rounded-[12px] px-3 py-2 text-sm",
                  active ? "bg-surface-elevated font-medium text-text" : "text-text-muted hover:bg-surface-elevated hover:text-text",
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
