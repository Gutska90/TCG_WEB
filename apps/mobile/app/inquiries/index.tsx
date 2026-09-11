import { useQuery } from "@tanstack/react-query";
import { SELLER_INQUIRY_STATUS_LABELS, formatClp, inquiryNumberLabel } from "@tcg/config";
import { useRouter } from "expo-router";
import { listInquiries } from "../../src/lib/endpoints";
import { userFacingError } from "../../src/lib/errors";
import { EmptyState, ErrorText, LoadingState, Screen } from "../../src/ui/screen";
import { ListRow } from "../../src/ui/list-row";
import { RequireAuth } from "../../src/ui/nav";

function Inner() {
  const router = useRouter();
  const sold = useQuery({ queryKey: ["inquiries", "seller"], queryFn: () => listInquiries("seller") });
  const bought = useQuery({ queryKey: ["inquiries", "buyer"], queryFn: () => listInquiries("buyer") });

  if (sold.isLoading || bought.isLoading) return <Screen title="Consultas"><LoadingState /></Screen>;
  if (sold.error) return <Screen title="Consultas"><ErrorText message={userFacingError(sold.error)} /></Screen>;
  if (bought.error) return <Screen title="Consultas"><ErrorText message={userFacingError(bought.error)} /></Screen>;

  const received = sold.data?.items ?? [];
  const sent = bought.data?.items ?? [];

  return (
    <Screen title="Consultas">
      {received.length === 0 && sent.length === 0 ? (
        <EmptyState>Aún no hay consultas. El lote se consulta desde el carrito y no reserva stock.</EmptyState>
      ) : null}
      {received.map((row) => (
        <ListRow
          key={row.id}
          title={inquiryNumberLabel(row.inquiryNumber)}
          subtitle={`Recibida · ${row.seller.displayName} · ${SELLER_INQUIRY_STATUS_LABELS[row.status]}`}
          right={formatClp(row.subtotalClp)}
          onPress={() => router.push(`/inquiries/${row.id}`)}
        />
      ))}
      {sent.map((row) => (
        <ListRow
          key={row.id}
          title={inquiryNumberLabel(row.inquiryNumber)}
          subtitle={`Enviada · ${row.seller.displayName} · ${SELLER_INQUIRY_STATUS_LABELS[row.status]}`}
          right={formatClp(row.subtotalClp)}
          onPress={() => router.push(`/inquiries/${row.id}`)}
        />
      ))}
    </Screen>
  );
}

export default function InquiriesScreen() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}
