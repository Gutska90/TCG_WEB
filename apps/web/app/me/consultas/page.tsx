"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SELLER_INQUIRY_STATUS_LABELS, formatClp, inquiryNumberLabel } from "@tcg/config";
import type { Paginated, SellerInquiryView } from "@tcg/types";
import { ApiError } from "../../../lib/api";
import { userFacingError, loginHref } from "../../../lib/errors";
import { listInquiries } from "../../../lib/inquiries";
import { EmptyState, FormError, LoadingBlock, PageMain } from "../../../components/ui-feedback";

export default function InquiriesPage() {
  const router = useRouter();
  const [bought, setBought] = useState<SellerInquiryView[] | null>(null);
  const [sold, setSold] = useState<SellerInquiryView[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listInquiries("buyer"), listInquiries("seller")])
      .then(([asBuyer, asSeller]: [Paginated<SellerInquiryView>, Paginated<SellerInquiryView>]) => {
        setBought(asBuyer.items);
        setSold(asSeller.items);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) router.replace(loginHref("/me/consultas"));
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
  if (!bought || !sold) {
    return (
      <PageMain width="lg">
        <LoadingBlock />
      </PageMain>
    );
  }

  return (
    <PageMain width="lg">
      <h1 className="text-2xl font-semibold">Consultas</h1>
      <p className="mt-2 text-sm text-text-muted">
        Una consulta no reserva stock. El pago sigue en TCG Market Chile.
      </p>
      <section className="mt-8">
        <h2 className="text-lg font-medium">Recibidas</h2>
        {sold.length === 0 ? (
          <EmptyState>Aún no te consultan un lote.</EmptyState>
        ) : (
          <InquiryList rows={sold} />
        )}
      </section>
      <section className="mt-8">
        <h2 className="text-lg font-medium">Enviadas</h2>
        {bought.length === 0 ? (
          <EmptyState>
            Aún no envías consultas.{" "}
            <Link href="/carrito" className="underline">
              Ir al carrito
            </Link>
          </EmptyState>
        ) : (
          <InquiryList rows={bought} />
        )}
      </section>
    </PageMain>
  );
}

function InquiryList({ rows }: { rows: SellerInquiryView[] }) {
  return (
    <ul className="mt-4 grid gap-3">
      {rows.map((row) => (
        <li key={row.id}>
          <Link href={`/me/consultas/${row.id}`} className="block rounded-[16px] border border-border bg-surface p-4">
            {inquiryNumberLabel(row.inquiryNumber)} · {row.seller.displayName} ·{" "}
            {SELLER_INQUIRY_STATUS_LABELS[row.status]} · {formatClp(row.subtotalClp)}
          </Link>
        </li>
      ))}
    </ul>
  );
}
