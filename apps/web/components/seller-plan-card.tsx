"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatClp, formatFeePercentEsCl, sellerPlanLabel } from "@tcg/config";
import type { SellerPlanView } from "@tcg/types";
import { fetchSellerPlan } from "../lib/seller-plans";

export function SellerPlanCard() {
  const [plan, setPlan] = useState<SellerPlanView | null>(null);

  useEffect(() => {
    void fetchSellerPlan()
      .then(setPlan)
      .catch(() => setPlan(null));
  }, []);

  if (!plan) return null;

  return (
    <section className="rounded-[16px] border border-border bg-surface p-4" aria-labelledby="seller-plan-heading">
      <h2 id="seller-plan-heading" className="text-base font-semibold">
        Tu plan
      </h2>
      <p className="mt-2 text-sm">
        {sellerPlanLabel(plan.plan)} · {formatClp(plan.monthlyPriceClp)} / mes · comisión normal {formatFeePercentEsCl(plan.normalFeeBps)} ·
        tope {formatClp(plan.normalFeeCapClp)}
      </p>
      {plan.promotion.active ? (
        <p className="mt-2 text-sm">
          Promoción activa: {formatFeePercentEsCl(plan.promotion.effectiveFeeBps)}
          {plan.promotion.endsAt
            ? ` hasta ${new Date(plan.promotion.endsAt).toLocaleDateString("es-CL")}`
            : ""}
          . Tarifa normal del plan: {formatFeePercentEsCl(plan.normalFeeBps)}.
        </p>
      ) : null}
      <p className="mt-2 text-sm text-text-muted">{plan.billing.message}</p>
      <p className="mt-3 text-sm">
        <Link href="/planes" className="underline">
          Ver planes
        </Link>
        {" · "}
        Disponible durante beta mediante invitación.
      </p>
    </section>
  );
}
