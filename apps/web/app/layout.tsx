import type { Metadata } from "next";
import type { ReactNode } from "react";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { OfflineBanner } from "../components/offline-banner";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import { ThemeProvider } from "../components/theme-provider";
import { THEME_INIT_SCRIPT } from "../lib/theme-script";
import "./globals.css";

export const metadata: Metadata = {
  title: "TCG Market Chile",
  description: "Marketplace de cartas coleccionables para Chile",
  robots: { index: false, follow: false },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-CL" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={`${GeistSans.variable} ${GeistMono.variable} min-h-screen bg-background font-sans text-text antialiased`}>
        <ThemeProvider>
          <a className="skip-link" href="#contenido">
            Saltar al contenido
          </a>
          <OfflineBanner />
          <SiteHeader />
          {children}
          <SiteFooter />
        </ThemeProvider>
      </body>
    </html>
  );
}
