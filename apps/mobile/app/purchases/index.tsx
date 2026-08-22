import { useQuery } from "@tanstack/react-query";
import { ORDER_STATUS_LABELS, formatClp } from "@tcg/config";
import { useRouter } from "expo-router";
import { listOrders } from "../../src/lib/endpoints";
import { userFacingError } from "../../src/lib/errors";
import { EmptyState, ErrorText, LoadingState, Screen } from "../../src/ui/screen";
import { ListRow } from "../../src/ui/list-row";
import { RequireAuth } from "../../src/ui/nav";

function Inner() {
  const router = useRouter();
  const query = useQuery({ queryKey: ["orders", "buyer"], queryFn: () => listOrders("buyer") });
  if (query.isLoading) return <Screen title="Mis compras"><LoadingState /></Screen>;
  if (query.error) return <Screen title="Mis compras"><ErrorText message={userFacingError(query.error)} /></Screen>;
  return (
    <Screen title="Mis compras">
      {query.data?.items.length === 0 ? <EmptyState>Aún no hay compras.</EmptyState> : null}
      {query.data?.items.map((order) => (
        <ListRow
          key={order.id}
          title={order.orderNumber}
          subtitle={`${order.seller.displayName} · ${ORDER_STATUS_LABELS[order.status]} · ${new Date(order.createdAt).toLocaleDateString("es-CL")}`}
          right={formatClp(order.totalClp)}
          onPress={() => router.push(`/purchases/${order.id}`)}
        />
      ))}
    </Screen>
  );
}

export default function PurchasesScreen() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}
