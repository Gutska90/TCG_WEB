"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatClp } from "@tcg/config";
import type { SellerBalanceView } from "@tcg/types";
import { ApiError, api } from "../../../lib/api";
import { userFacingError, loginHref } from "../../../lib/errors";
import { FormError, LoadingBlock, PageMain } from "../../../components/ui-feedback";

export default function SellerBalancePage() {
  const router = useRouter();
  const [data, setData] = useState<SellerBalanceView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<SellerBalanceView>("/v1/me/balance")
      .then(setData)
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) router.replace(loginHref("/me/balance"));
        else setError(userFacingError(err));
      });
  }, [router]);

  if (error) {
    return (
      <PageMain>
        <FormError message={error} />
      </PageMain>
    );
  }
  if (!data) {
    return (
      <PageMain>
        <LoadingBlock />
      </PageMain>
    );
  }

  return (
    <PageMain>
      <h1 className="text-2xl font-semibold">Saldo vendedor</h1>
      <p className="mt-2 text-sm text-text-muted">
        Pendiente: pago recibido, aún no elegible para liquidación. Disponible: elegible para liquidación. Las liquidaciones las registra el staff.
      </p>
      <dl className="mt-6 grid max-w-sm gap-2 text-sm">
        <div className="flex justify-between"><dt>Pendiente</dt><dd>{formatClp(data.pendingClp)}</dd></div>
        <div className="flex justify-between"><dt>Disponible</dt><dd>{formatClp(data.availableClp)}</dd></div>
        <div className="flex justify-between"><dt>Reservado en liquidación</dt><dd>{formatClp(data.reservedClp)}</dd></div>
        <div className="flex justify-between"><dt>Liquidado</dt><dd>{formatClp(data.paidClp)}</dd></div>
        <div className="flex justify-between font-medium"><dt>Neto</dt><dd>{formatClp(data.netClp)}</dd></div>
      </dl>
      <p className="mt-8 text-sm">
        <Link href="/me/ventas" className="underline">Mis ventas</Link>
        {" · "}
        <Link href="/ayuda" className="underline">Ayuda</Link>
      </p>
    </PageMain>
  );
}
