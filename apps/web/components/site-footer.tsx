import { LEGAL, PUBLIC_LEGAL_LINKS } from "@tcg/config";
import Link from "next/link";

const COLUMNS = [
  {
    title: "Marketplace",
    links: [
      { href: "/buscar?hasListings=true", label: "Buscar" },
      { href: "/vender", label: "Vender" },
      { href: "/planes", label: "Planes" },
    ],
  },
  {
    title: "Cuenta",
    links: [
      { href: "/ingresar", label: "Ingresar" },
      { href: "/me", label: "Mi perfil" },
      { href: "/me/coleccion", label: "Colección" },
      { href: "/me/wishlist", label: "Wishlist" },
    ],
  },
  {
    title: "Ayuda",
    links: [{ href: "/ayuda", label: "Ayuda" }],
  },
  {
    title: "Legal",
    links: [
      ...PUBLIC_LEGAL_LINKS.map((link) => ({ href: link.href, label: link.label })),
      { href: "/legal/fuentes", label: "Fuentes de catálogo" },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-8 border-t border-border bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        {COLUMNS.map((column) => (
          <div key={column.title}>
            <p className="text-xs font-medium tracking-wide text-text-muted uppercase">{column.title}</p>
            <ul className="mt-3 grid gap-2 text-sm">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-text hover:text-primary">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-xs text-text-muted sm:flex-row sm:items-center sm:px-6">
          <span>Beta · {LEGAL.betaProductNotice}</span>
        </div>
      </div>
    </footer>
  );
}
