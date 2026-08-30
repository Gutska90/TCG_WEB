"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatClp, formatFeePercentEsCl } from "@tcg/config";
import type { PublicPlatformConfig } from "@tcg/types";
import { fetchPublicConfig } from "../../lib/config";

export default function PlansPage() {
  const [config, setConfig] = useState<PublicPlatformConfig | null>(null);

  useEffect(() => {
    void fetchPublicConfig().then(setConfig);
  }, []);

  if (!config) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <p className="text-sm text-text-muted">Cargando planes…</p>
      </main>
    );
  }

  const promo = config.sellerPlans.launchPromo;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <p className="text-sm font-medium tracking-wide text-text-muted uppercase">Vendedores</p>
      <h1 className="mt-2 text-3xl font-medium tracking-tight">Planes</h1>
      <p className="mt-3 max-w-2xl text-sm text-text-muted">
        Vende a tu ritmo. Sin mensualidad obligatoria. Empieza gratis y reduce tu comisión a medida que creces.
      </p>
      <p className="mt-2 text-sm text-text-muted">Desde $0 al mes. Comisiones entre 6% y 3% según tu plan.</p>

      {promo.active ? (
        <section className="mt-6 rounded-[16px] border border-border bg-surface p-4" aria-label="Promoción de lanzamiento">
          <p className="text-xs font-semibold tracking-wide uppercase">Lanzamiento</p>
          <p className="mt-1 text-sm">3% para todos durante la promoción.</p>
          {promo.endsAt ? (
            <p className="mt-1 text-sm text-text-muted">Hasta {new Date(promo.endsAt).toLocaleDateString("es-CL")}.</p>
          ) : null}
        </section>
      ) : null}

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {config.sellerPlans.plans.map((plan) => (
          <article key={plan.plan} className="flex flex-col rounded-[16px] border border-border bg-surface p-5">
            <h2 className="text-lg font-semibold">{plan.label}</h2>
            <p className="mt-2 text-2xl font-medium">{formatClp(plan.monthlyPriceClp)} / mes</p>
            <p className="mt-3 text-sm">
              Comisión: {formatFeePercentEsCl(plan.platformFeeBps)}
              {promo.active ? ` · ahora ${formatFeePercentEsCl(promo.feeBps)}` : ""}
            </p>
            <p className="text-sm text-text-muted">Tope: {formatClp(plan.platformFeeCapClp)} por orden</p>
            {promo.active ? (
              <p className="mt-2 text-sm text-text-muted">
                Tarifa normal del plan: {formatFeePercentEsCl(plan.platformFeeBps)} / tope {formatClp(plan.platformFeeCapClp)}.
              </p>
            ) : null}
            <ul className="mt-4 grid gap-1 text-sm">
              <li>Publicar: sí</li>
              <li>Comprar: sí</li>
              <li>Colección: sí</li>
              <li>Wishlist: sí</li>
              <li>Precios: sí</li>
            </ul>
            {plan.plan === "FREE" ? (
              <p className="mt-4 text-sm">Marketplace completo. Sin mensualidad.</p>
            ) : null}
            {plan.plan === "SELLER_PLUS" ? (
              <p className="mt-4 text-sm text-text-muted">Todo Free, con comisión más baja. Sin herramientas extra prometidas en esta fase.</p>
            ) : null}
            {plan.plan === "SELLER_PRO" ? (
              <p className="mt-4 text-sm text-text-muted">Todo Plus, con comisión más baja para vendedores frecuentes.</p>
            ) : null}
            {plan.plan === "STORE" ? (
              <p className="mt-4 text-sm text-text-muted">Plan de comisión para vendedores de alto volumen.</p>
            ) : null}
          </article>
        ))}
      </div>

      <section className="mt-10 overflow-x-auto" aria-label="Comparación de planes">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead>
            <tr>
              <th className="py-2 pr-3 font-medium">Campo</th>
              {config.sellerPlans.plans.map((plan) => (
                <th key={plan.plan} className="py-2 pr-3 font-medium">
                  {plan.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-border">
              <th className="py-2 pr-3 font-normal">Precio mensual</th>
              {config.sellerPlans.plans.map((plan) => (
                <td key={plan.plan}>{formatClp(plan.monthlyPriceClp)}</td>
              ))}
            </tr>
            <tr className="border-t border-border">
              <th className="py-2 pr-3 font-normal">Comisión</th>
              {config.sellerPlans.plans.map((plan) => (
                <td key={plan.plan}>{formatFeePercentEsCl(plan.platformFeeBps)}</td>
              ))}
            </tr>
            <tr className="border-t border-border">
              <th className="py-2 pr-3 font-normal">Tope</th>
              {config.sellerPlans.plans.map((plan) => (
                <td key={plan.plan}>{formatClp(plan.platformFeeCapClp)}</td>
              ))}
            </tr>
            {["Publicar", "Comprar", "Colección", "Wishlist", "Precios"].map((row) => (
              <tr key={row} className="border-t border-border">
                <th className="py-2 pr-3 font-normal">{row}</th>
                {config.sellerPlans.plans.map((plan) => (
                  <td key={plan.plan}>sí</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-10 max-w-2xl text-sm text-text-muted">
        <h2 className="text-base font-semibold text-text">Cómo se cobra</h2>
        <p className="mt-2">
          La comisión de TCG Market se descuenta al vendedor sobre el subtotal de productos. El comprador no paga comisión de
          plataforma. El costo del medio de pago se calcula por separado y no se estima como dato financiero.
        </p>
        <p className="mt-2">
          Las órdenes ya creadas conservan la tarifa vigente al momento de crearlas. Las tarifas futuras pueden cambiar para
          operaciones nuevas. Durante la beta las mensualidades no se cobran de forma automática.
        </p>
        <p className="mt-2">
          Disponible durante beta mediante invitación.{" "}
          <Link href="/marketplace" className="underline">
            Ver reglas del marketplace
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
