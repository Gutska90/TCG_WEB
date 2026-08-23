"use client";

import { cx } from "@tcg/ui";
import { Heart, Menu, ShoppingCart, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { GameView } from "@tcg/types";
import { fetchMe, logout } from "../lib/api";
import { getCart } from "../lib/cart";
import { SearchForm } from "./search-form";
import { ThemeToggle } from "./theme-toggle";
import { Badge } from "./ui/badge";
import { buttonClassName } from "./ui/button-styles";

export function SiteHeader() {
  const pathname = usePathname();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [games, setGames] = useState<GameView[]>([]);

  useEffect(() => {
    void fetchMe()
      .then(() => setSignedIn(true))
      .catch(() => setSignedIn(false));
    void getCart()
      .then((cart) => setCartCount(cart.itemCount))
      .catch(() => setCartCount(0));
  }, [pathname]);

  useEffect(() => {
    void fetch("/v1/games")
      .then((res) => (res.ok ? res.json() : []))
      .then((rows: GameView[]) => setGames(Array.isArray(rows) ? rows : []))
      .catch(() => setGames([]));
  }, []);

  const accountLinks = signedIn
    ? [
        { href: "/me", label: "Mi perfil" },
        { href: "/me/coleccion", label: "Colección" },
        { href: "/me/wishlist", label: "Wishlist" },
        { href: "/me/compras", label: "Compras" },
        { href: "/me/ventas", label: "Ventas" },
        { href: "/me/publicaciones", label: "Publicaciones" },
        { href: "/me/seguridad", label: "Seguridad" },
      ]
    : [
        { href: "/ingresar", label: "Ingresar" },
        { href: "/registro", label: "Crear cuenta" },
      ];

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 tracking-tight">
          <span className="text-base font-semibold">TCG MARKET</span>
          <span className="hidden text-xs font-medium text-text-muted sm:inline">Chile</span>
          <Badge tone="primary">Beta</Badge>
        </Link>
        <div className="hidden min-w-0 flex-1 md:block">
          <SearchForm compact />
        </div>
        <nav className="ml-auto flex items-center gap-1" aria-label="Accesos">
          <ThemeToggle compact />
          {signedIn ? (
            <Link
              href="/me/wishlist"
              aria-label="Wishlist"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[12px] text-text hover:bg-surface-elevated"
            >
              <Heart className="h-5 w-5" />
            </Link>
          ) : null}
          <Link
            href="/carrito"
            aria-label="Carrito"
            className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-[12px] text-text hover:bg-surface-elevated"
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 ? (
              <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-white">
                {cartCount}
              </span>
            ) : null}
          </Link>
          <details className="relative hidden md:block">
            <summary className="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-[12px] hover:bg-surface-elevated">
              <User className="h-5 w-5" />
              <span className="sr-only">Cuenta</span>
            </summary>
            <nav
              className="absolute right-0 z-20 mt-2 w-52 rounded-[12px] border border-border bg-surface p-2 text-sm shadow-[var(--shadow)]"
              aria-label="Cuenta"
            >
              {accountLinks.map((item) => (
                <Link key={item.href} href={item.href} className="block rounded-[10px] px-3 py-2 hover:bg-surface-elevated">
                  {item.label}
                </Link>
              ))}
              {signedIn ? (
                <button
                  type="button"
                  className="block w-full rounded-[10px] px-3 py-2 text-left hover:bg-surface-elevated"
                  onClick={() => {
                    void logout().then(() => {
                      window.location.href = "/";
                    });
                  }}
                >
                  Cerrar sesión
                </button>
              ) : null}
            </nav>
          </details>
          <details className="relative md:hidden">
            <summary className="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-[12px] border border-border">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Menú</span>
            </summary>
            <nav
              className="absolute right-0 z-20 mt-2 w-64 rounded-[12px] border border-border bg-surface p-3 text-sm shadow-[var(--shadow)]"
              aria-label="Principal móvil"
            >
              <div className="mb-3">
                <SearchForm compact />
              </div>
              {games.map((game) => (
                <Link key={game.id} href={`/${game.slug}`} className="block rounded-[10px] px-2 py-2">
                  {game.name}
                </Link>
              ))}
              <Link href="/vender" className="block rounded-[10px] px-2 py-2 font-medium">
                Vender
              </Link>
              {accountLinks.map((item) => (
                <Link key={item.href} href={item.href} className="block rounded-[10px] px-2 py-2">
                  {item.label}
                </Link>
              ))}
            </nav>
          </details>
        </nav>
      </div>
      <div className="hidden border-t border-border md:block">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 sm:px-6">
          <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto text-sm" aria-label="Juegos">
            {games.map((game) => (
              <Link
                key={game.id}
                href={`/${game.slug}`}
                className={cx(
                  "shrink-0 rounded-[10px] px-3 py-2 text-text-muted hover:bg-surface-elevated hover:text-text",
                  pathname === `/${game.slug}` && "bg-surface-elevated font-medium text-text",
                )}
              >
                {game.name}
              </Link>
            ))}
          </nav>
          <Link href="/vender" className={buttonClassName("primary", "shrink-0")}>
            Vender
          </Link>
        </div>
      </div>
    </header>
  );
}
