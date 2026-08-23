"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ORDER_STATUS_LABELS, formatClp } from "@tcg/config";
import type { OrderView, Paginated } from "@tcg/types";
import { ApiError } from "../../../lib/api";
import { userFacingError, loginHref } from "../../../lib/errors";
import { listOrders } from "../../../lib/orders";
import { EmptyState, FormError, LoadingBlock, PageMain } from "../../../components/ui-feedback";

export default function PurchasesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<OrderView[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listOrders("buyer")
      .then((data: Paginated<OrderView>) => setRows(data.items))
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) router.replace(loginHref("/me/compras"));
        else setError(userFacingError(err));
      });
  }, [router]);

  if (error) {
    return (
      <PageMain width="lg">
        <FormError message={error} />
      </PageMain>
    );
  }
  if (!rows) {
    return (
      <PageMain width="lg">
        <LoadingBlock />
      </PageMain>
    );
  }

  return (
    <PageMain width="lg">
      <h1 className="text-2xl font-semibold">Mis compras</h1>
      {rows.length === 0 ? (
        <EmptyState>
          Aún no hay compras.{" "}
          <Link href="/buscar" className="underline">
            Buscar cartas
          </Link>
        </EmptyState>
      ) : (
        <ul className="mt-6 grid gap-3">
          {rows.map((order) => (
            <li key={order.id}>
              <Link href={`/me/compras/${order.id}`} className="block rounded-[16px] border border-border bg-surface p-4">
                {order.orderNumber} · {ORDER_STATUS_LABELS[order.status]} · {formatClp(order.totalClp)}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageMain>
  );
}
