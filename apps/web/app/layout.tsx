import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
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
        <SiteHeader />
        {children}
        <footer className="border-t border-neutral-200">
          <div className="mx-auto flex max-w-5xl gap-4 px-6 py-4 text-sm text-neutral-600">
            <Link href="/legal/fuentes" className="underline">
              Fuentes de catálogo
            </Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
