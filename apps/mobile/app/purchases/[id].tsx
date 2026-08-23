import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DISPUTE_REASON_LABELS,
  DISPUTE_REASONS,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_USER_LABELS,
  SHIPPING_METHOD_LABELS,
  formatClp,
  type DisputeReason,
} from "@tcg/config";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import type { DisputeDetailView } from "@tcg/types";
import { track } from "../../src/lib/analytics";
import { api } from "../../src/lib/api";
import { addCollectionItem, getOrder, postOrder, rateOrder } from "../../src/lib/endpoints";
import { orderTimeline } from "../../src/lib/order-timeline";
import { userFacingError } from "../../src/lib/errors";
import { Button, EmptyState, ErrorText, LoadingState, Screen, SuccessText } from "../../src/ui/screen";
import { Field } from "../../src/ui/field";
import { RequireAuth } from "../../src/ui/nav";
import { useColors } from "../../src/ui/theme-provider";

function Inner() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [stars, setStars] = useState("5");
  const [comment, setComment] = useState("");
  const [reason, setReason] = useState<DisputeReason>("ITEM_NOT_RECEIVED");
  const [description, setDescription] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const query = useQuery({ queryKey: ["order", id], queryFn: () => getOrder(id), enabled: Boolean(id) });
  const confirm = useMutation({
    mutationFn: () => postOrder(id, "confirm-receipt"),
    onSuccess: () => {
      setNotice("Recibiste la orden.");
      void qc.invalidateQueries({ queryKey: ["order", id] });
    },
  });
  const rate = useMutation({
    mutationFn: () => rateOrder(id, { stars: Number(stars), comment: comment || undefined }),
    onSuccess: () => {
      setNotice("Valoración enviada.");
      void qc.invalidateQueries({ queryKey: ["order", id] });
    },
  });
  const addCol = useMutation({
    mutationFn: (item: { variantId: string; condition: string; quantity: number; unitPriceClp: number }) =>
      addCollectionItem({
        variantId: item.variantId,
        condition: item.condition,
        quantity: item.quantity,
        purchasePriceClp: item.unitPriceClp,
      }),
    onSuccess: () => setNotice("Agregada a tu colección."),
  });
  const dispute = useMutation({
    mutationFn: () =>
      api<DisputeDetailView>(`/v1/orders/${id}/disputes`, {
        method: "POST",
        body: JSON.stringify({ reason, description: description || undefined }),
      }),
    onSuccess: (row) => {
      track("dispute_opened");
      router.push(`/disputes/${row.id}`);
    },
  });

  if (query.isLoading) return <Screen title="Compra"><LoadingState /></Screen>;
  if (query.error) return <Screen title="Compra"><ErrorText message={userFacingError(query.error)} /></Screen>;
  const order = query.data;
  if (!order) return null;
  const timeline = orderTimeline(order);

  return (
    <Screen title={order.orderNumber}>
      <Text>
        Vendedor {order.seller.displayName} · {ORDER_STATUS_LABELS[order.status]}
      </Text>
      <Text>Total {formatClp(order.totalClp)} · envío {SHIPPING_METHOD_LABELS[order.shippingMethod]}</Text>
      {order.payment ? <Text>{PAYMENT_STATUS_USER_LABELS[order.payment.status]}</Text> : null}
      {order.items.map((item) => (
        <View key={item.listingId} style={{ gap: 4, marginTop: 8 }}>
          <Text>
            {item.titleSnapshot} · x{item.quantity} · {formatClp(item.lineTotalClp)}
          </Text>
          {order.status === "COMPLETED" ? (
            <Button
              variant="secondary"
              label="Añadir a colección"
              pending={addCol.isPending}
              onPress={() => addCol.mutate(item)}
            />
          ) : null}
        </View>
      ))}
      {order.shipment ? (
        <Text style={{ color: colors.muted }}>
          Envío {order.shipment.status}
          {order.shipment.trackingCode ? ` · ${order.shipment.trackingCode}` : ""}
        </Text>
      ) : null}
      {"closed" in timeline ? (
        <EmptyState>Esta orden está {timeline.closed === "CANCELLED" ? "cancelada" : "reembolsada"}.</EmptyState>
      ) : (
        <View>
          <Text style={{ fontWeight: "600" }}>Línea de tiempo</Text>
          {timeline.map((step) => (
            <Text key={step.label} style={{ color: step.state === "pending" ? colors.muted : colors.text }}>
              {step.state === "done" ? "●" : step.state === "current" ? "○" : "·"} {step.label}
              {step.at ? ` · ${new Date(step.at).toLocaleString("es-CL")}` : ""}
            </Text>
          ))}
        </View>
      )}
      {order.status === "DELIVERED" ? (
        <Button label="Confirmar recepción" pending={confirm.isPending} onPress={() => confirm.mutate()} />
      ) : null}
      {!order.rating && (order.status === "CONFIRMED" || order.status === "COMPLETED" || order.status === "DELIVERED") ? (
        <View style={{ gap: 8 }}>
          <Field label="Estrellas 1-5" value={stars} onChangeText={setStars} keyboardType="numeric" />
          <Field label="Comentario" value={comment} onChangeText={setComment} multiline />
          <Button label="Valorar vendedor" pending={rate.isPending} onPress={() => rate.mutate()} />
        </View>
      ) : null}
      {order.status !== "CANCELLED" && order.status !== "REFUNDED" ? (
        <View style={{ gap: 8, marginTop: 12 }}>
          <Text style={{ fontWeight: "600" }}>Abrir reclamo</Text>
          {DISPUTE_REASONS.map((value) => (
            <Button
              key={value}
              variant={reason === value ? "primary" : "secondary"}
              label={DISPUTE_REASON_LABELS[value]}
              onPress={() => setReason(value)}
            />
          ))}
          <Field label="Detalle" value={description} onChangeText={setDescription} multiline />
          <Button label="Abrir reclamo" pending={dispute.isPending} onPress={() => dispute.mutate()} />
        </View>
      ) : null}
      <SuccessText message={notice} />
      <ErrorText
        message={
          confirm.error
            ? userFacingError(confirm.error)
            : rate.error
              ? userFacingError(rate.error)
              : dispute.error
                ? userFacingError(dispute.error)
                : addCol.error
                  ? userFacingError(addCol.error)
                  : null
        }
      />
    </Screen>
  );
}

export default function PurchaseDetailScreen() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}
