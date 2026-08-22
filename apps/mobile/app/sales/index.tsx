import { useQuery } from "@tanstack/react-query";
import { ORDER_STATUS_LABELS, formatClp } from "@tcg/config";
import { useRouter } from "expo-router";
import { listOrders } from "../../src/lib/endpoints";
import { useAuth } from "../../src/lib/auth";
import { userFacingError } from "../../src/lib/errors";
import { EmptyState, ErrorText, LoadingState, Screen } from "../../src/ui/screen";
import { ListRow } from "../../src/ui/list-row";
import { RequireAuth, TextLink } from "../../src/ui/nav";

function Inner() {
  const router = useRouter();
  const { me } = useAuth();
  const query = useQuery({
    queryKey: ["orders", "seller"],
    queryFn: () => listOrders("seller"),
    enabled: Boolean(me?.roles.includes("SELLER")),
  });
  if (!me?.roles.includes("SELLER")) {
    return (
      <Screen title="Mis ventas">
        <EmptyState>Esta sección es para vendedores.</EmptyState>
        <TextLink href="/seller-onboarding" label="Activar cuenta vendedor" />
      </Screen>
    );
  }
  if (query.isLoading) return <Screen title="Mis ventas"><LoadingState /></Screen>;
  if (query.error) return <Screen title="Mis ventas"><ErrorText message={userFacingError(query.error)} /></Screen>;
  return (
    <Screen title="Mis ventas">
      {query.data?.items.length === 0 ? <EmptyState>Aún no hay ventas.</EmptyState> : null}
      {query.data?.items.map((order) => (
        <ListRow
          key={order.id}
          title={order.orderNumber}
          subtitle={`${order.buyer.displayName} · ${ORDER_STATUS_LABELS[order.status]}`}
          right={formatClp(order.totalClp)}
          onPress={() => router.push(`/sales/${order.id}`)}
        />
      ))}
    </Screen>
  );
}

export default function SalesScreen() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}
