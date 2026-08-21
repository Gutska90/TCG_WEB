import Link from "next/link";
import { SearchForm } from "./search-form";

export function SiteHeader() {
  return (
    <header className="border-b border-neutral-200">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="font-semibold tracking-tight">
          TCG Platform
        </Link>
        <SearchForm compact />
        <nav className="flex gap-4 text-sm">
          <Link href="/carrito" className="text-neutral-700 hover:text-black">
            Carrito
          </Link>
          <Link href="/vender" className="text-neutral-700 hover:text-black">
            Vender
          </Link>
          <Link href="/buscar" className="text-neutral-700 hover:text-black">
            Buscar
          </Link>
          <Link href="/me/favoritos" className="text-neutral-700 hover:text-black">
            Favoritos
          </Link>
          <Link href="/ingresar" className="text-neutral-700 hover:text-black">
            Ingresar
          </Link>
          <Link href="/registro" className="text-neutral-700 hover:text-black">
            Crear cuenta
          </Link>
          <Link href="/me" className="text-neutral-700 hover:text-black">
            Mi perfil
          </Link>
        </nav>
      </div>
    </header>
  );
}
