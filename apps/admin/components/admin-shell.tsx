"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { MeView } from "@tcg/types";
import { canAccessAdminApp, canAccessAdminOps, canAccessModeration } from "@/lib/access";
import { api, logout } from "@/lib/api";

const OPS_NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/system", label: "Sistema" },
  { href: "/admin/jobs", label: "Jobs" },
  { href: "/admin/orders", label: "Órdenes" },
  { href: "/admin/payments", label: "Pagos" },
  { href: "/admin/refunds", label: "Refunds" },
  { href: "/admin/payouts", label: "Payouts" },
  { href: "/admin/ledger", label: "Ledger" },
  { href: "/admin/reconciliation", label: "Conciliación" },
  { href: "/admin/users", label: "Usuarios" },
  { href: "/admin/listings", label: "Listings" },
  { href: "/admin/catalog", label: "Catálogo" },
  { href: "/admin/feedback", label: "Feedback" },
];

const MOD_NAV = [
  { href: "/admin/disputes", label: "Disputas" },
  { href: "/admin/reports", label: "Reportes" },
  { href: "/admin/moderation", label: "Moderación" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<MeView | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const profile = await api<MeView>("/v1/me");
        if (cancelled) return;
        if (!canAccessAdminApp(profile.roles)) {
          await logout();
          router.replace("/admin/ingresar");
          return;
        }
        setMe(profile);
      } catch {
        if (!cancelled) {
          router.replace("/admin/ingresar");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!me) {
    return <p className="px-6 py-16 text-sm text-text-muted">Cargando…</p>;
  }

  const nav = [
    ...(canAccessAdminOps(me.roles) ? OPS_NAV : []),
    ...(canAccessModeration(me.roles) ? MOD_NAV : []),
  ];

  return (
    <div className="min-h-screen bg-background text-text">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <p className="text-sm font-semibold tracking-tight">TCG Admin</p>
          <nav className="flex flex-wrap gap-3 text-sm">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={
                  pathname === item.href ? "text-text" : "text-text-muted hover:text-text"
                }
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-xs text-text-muted">
            <span>{me.email}</span>
            <button
              type="button"
              className="underline"
              onClick={() => {
                void logout().then(() => router.replace("/admin/ingresar"));
              }}
            >
              Salir
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-6">{children}</div>
    </div>
  );
}
