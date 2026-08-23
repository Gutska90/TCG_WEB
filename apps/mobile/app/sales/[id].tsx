import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ORDER_STATUS_LABELS, SHIPPING_METHOD_LABELS, formatClp } from "@tcg/config";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text } from "react-native";
import { getOrder, postOrder } from "../../src/lib/endpoints";
import { orderTimeline } from "../../src/lib/order-timeline";
import { userFacingError } from "../../src/lib/errors";
import { Button, EmptyState, ErrorText, LoadingState, Screen, SuccessText } from "../../src/ui/screen";
import { Field } from "../../src/ui/field";
import { RequireAuth } from "../../src/ui/nav";
import { useColors } from "../../src/ui/theme-provider";

function Inner() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const [tracking, setTracking] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const query = useQuery({ queryKey: ["order", id], queryFn: () => getOrder(id), enabled: Boolean(id) });
  const prepare = useMutation({
    mutationFn: () => postOrder(id, "prepare"),
    onSuccess: () => {
      setNotice("Marcada como en preparación.");
      void qc.invalidateQueries({ queryKey: ["order", id] });
    },
  });
  const ship = useMutation({
    mutationFn: () => postOrder(id, "ship", tracking ? { trackingCode: tracking } : {}),
    onSuccess: () => {
      setNotice("Marcada como despachada.");
      void qc.invalidateQueries({ queryKey: ["order", id] });
    },
  });

  if (query.isLoading) return <Screen title="Venta"><LoadingState /></Screen>;
  if (query.error) return <Screen title="Venta"><ErrorText message={userFacingError(query.error)} /></Screen>;
  const order = query.data;
  if (!order) return null;
  const timeline = orderTimeline(order);

  return (
    <Screen title={order.orderNumber}>
      <Text>
        Comprador {order.buyer.displayName} · {ORDER_STATUS_LABELS[order.status]}
      </Text>
      <Text>
        {formatClp(order.totalClp)} · {SHIPPING_METHOD_LABELS[order.shippingMethod]}
      </Text>
      {order.items.map((item) => (
        <Text key={item.listingId}>
          {item.titleSnapshot} · x{item.quantity}
        </Text>
      ))}
      {"closed" in timeline ? (
        <EmptyState>Esta orden está {timeline.closed === "CANCELLED" ? "cancelada" : "reembolsada"}.</EmptyState>
      ) : (
        timeline.map((step) => (
          <Text key={step.label} style={{ color: step.state === "pending" ? colors.muted : colors.text }}>
            {step.label}
            {step.at ? ` · ${new Date(step.at).toLocaleString("es-CL")}` : ""}
          </Text>
        ))
      )}
      {order.status === "PAID" ? (
        <Button label="Preparar" pending={prepare.isPending} onPress={() => prepare.mutate()} />
      ) : null}
      {order.status === "PREPARING" ? (
        <>
          <Field label="Tracking (opcional)" value={tracking} onChangeText={setTracking} />
          <Button label="Marcar despachado" pending={ship.isPending} onPress={() => ship.mutate()} />
        </>
      ) : null}
      <SuccessText message={notice} />
      <ErrorText message={prepare.error ? userFacingError(prepare.error) : ship.error ? userFacingError(ship.error) : null} />
    </Screen>
  );
}

export default function SaleDetailScreen() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}
