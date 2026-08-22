"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchMe } from "../lib/api";
import { SearchForm } from "./search-form";

const NAV = [
  { href: "/buscar", label: "Buscar" },
  { href: "/carrito", label: "Carrito" },
  { href: "/vender", label: "Vender" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    void fetchMe()
      .then(() => setSignedIn(true))
      .catch(() => setSignedIn(false));
  }, [pathname]);

  const accountLinks = signedIn
    ? [
        { href: "/me", label: "Mi perfil" },
        { href: "/me/coleccion", label: "Colección" },
        { href: "/me/wishlist", label: "Wishlist" },
        { href: "/me/compras", label: "Compras" },
        { href: "/me/ventas", label: "Ventas" },
      ]
    : [
        { href: "/ingresar", label: "Ingresar" },
        { href: "/registro", label: "Crear cuenta" },
      ];

  return (
    <header className="border-b border-neutral-200">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight">
          TCG Platform
          <span className="rounded border border-neutral-300 px-1.5 py-0.5 text-[11px] font-normal tracking-wide text-neutral-600">
            Beta
          </span>
        </Link>
        <div className="hidden min-w-0 flex-1 md:block">
          <SearchForm compact />
        </div>
        <nav className="hidden items-center gap-4 text-sm lg:flex" aria-label="Principal">
          {[...NAV, ...accountLinks].map((item) => (
            <Link key={item.href} href={item.href} className="text-neutral-800 hover:text-black">
              {item.label}
            </Link>
          ))}
        </nav>
        <details className="relative lg:hidden">
          <summary className="cursor-pointer list-none rounded border border-neutral-300 px-3 py-1.5 text-sm">
            Menú
          </summary>
          <nav
            className="absolute right-0 z-20 mt-2 w-48 rounded border border-neutral-200 bg-white p-3 text-sm shadow-sm"
            aria-label="Principal móvil"
          >
            <div className="mb-3 md:hidden">
              <SearchForm compact />
            </div>
            {[...NAV, ...accountLinks].map((item) => (
              <Link key={item.href} href={item.href} className="block py-1.5 text-neutral-800">
                {item.label}
              </Link>
            ))}
          </nav>
        </details>
      </div>
    </header>
  );
}
