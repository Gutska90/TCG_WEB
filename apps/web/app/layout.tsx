import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { LEGAL, PUBLIC_LEGAL_LINKS } from "@tcg/config";
import { SiteHeader } from "../components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "TCG Platform",
  description: "Plataforma TCG para Chile",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-CL">
      <body>
        <a className="skip-link" href="#contenido">
          Saltar al contenido
        </a>
        <SiteHeader />
        {children}
        <footer className="border-t border-neutral-200">
          <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 text-sm text-neutral-700 sm:flex-row sm:flex-wrap sm:items-center sm:px-6">
            <span className="text-neutral-600">Beta · {LEGAL.betaProductNotice}</span>
            {PUBLIC_LEGAL_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="underline underline-offset-2"
              >
                {link.label}
              </Link>
            ))}
            <Link href="/legal/fuentes" className="underline underline-offset-2">
              Fuentes de catálogo
            </Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
