import { useMutation, useQuery } from "@tanstack/react-query";
import { ORDER_STATUS_LABELS, PAYMENT_COPY, PAYMENT_STATUS_USER_LABELS, formatClp } from "@tcg/config";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text } from "react-native";
import { track } from "../src/lib/analytics";
import { getCheckout, simulatePayment } from "../src/lib/endpoints";
import { checkoutUiStatus } from "../src/lib/order-timeline";
import { userFacingError } from "../src/lib/errors";
import { Button, ErrorText, LoadingState, SandboxBanner, Screen, SuccessText } from "../src/ui/screen";
import { RequireAuth } from "../src/ui/nav";
import { useColors } from "../src/ui/theme-provider";

const POLL_MS = 2500;
const TIMEOUT_MS = 45_000;

const COPY: Record<string, { title: string; body: string }> = {
  processing: { title: "Confirmando el pago", body: "Consultamos el estado en el servidor. No usamos el deep link como prueba de pago." },
  approved: { title: "Pago recibido", body: PAYMENT_COPY.held },
  rejected: { title: "Pago rechazado", body: "El procesador no aprobó el cobro." },
  expired: { title: "Checkout expirado", body: "Se acabó el tiempo de reserva." },
  timeout: { title: "Sigue en proceso", body: "Aún no confirmamos el cobro. Puedes revisar Mis compras más tarde." },
  cancelled: { title: "Checkout cancelado", body: "Este intento de pago ya no está activo." },
};

function ReturnInner() {
  const colors = useColors();
  const router = useRouter();
  const { checkoutId } = useLocalSearchParams<{ checkoutId?: string }>();
  const [timedOut, setTimedOut] = useState(false);
  const query = useQuery({
    queryKey: ["checkout", checkoutId],
    enabled: Boolean(checkoutId),
    queryFn: () => getCheckout(checkoutId!),
    refetchInterval: (ctx) => {
      const data = ctx.state.data;
      if (!data || data.status !== "PENDING_PAYMENT") return false;
      return POLL_MS;
    },
  });

  useEffect(() => {
    if (!checkoutId) return;
    const t = setTimeout(() => setTimedOut(true), TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [checkoutId]);

  const simulate = useMutation({
    mutationFn: () => simulatePayment(checkoutId!),
    onSuccess: (data) => {
      if (data.status === "PAID") track("checkout_completed_sandbox");
    },
  });

  if (!checkoutId) {
    return (
      <Screen title="Retorno de pago">
        <Text>Falta el checkout. No usamos el estado del deep link como prueba de pago.</Text>
        <Button label="Ver mis compras" onPress={() => router.replace("/purchases")} />
      </Screen>
    );
  }
  if (query.isLoading) return <Screen title="Confirmando el pago"><LoadingState label="Estamos confirmando el pago con el servidor…" /></Screen>;
  if (query.error) return <Screen title="Pago"><ErrorText message={userFacingError(query.error)} /></Screen>;
  const checkout = query.data;
  if (!checkout) return null;

  const ui = checkoutUiStatus({
    status: checkout.status,
    paymentStatuses: checkout.orders.map((order) => order.payment?.status),
    timedOut: timedOut && checkout.status === "PENDING_PAYMENT",
  });
  const copy = COPY[ui] ?? COPY.processing!;

  return (
    <Screen title={copy.title}>
      {checkout.mercadopago.mock ? <SandboxBanner /> : null}
      <Text>{copy.body}</Text>
      <Text style={{ fontWeight: "600" }}>Total {formatClp(checkout.totalClp)}</Text>
      {checkout.orders.map((order) => (
        <Text key={order.id} style={{ color: colors.muted }}>
          {order.orderNumber} · {ORDER_STATUS_LABELS[order.status]} ·{" "}
          {order.payment?.status ? PAYMENT_STATUS_USER_LABELS[order.payment.status] : "sin pago"}
        </Text>
      ))}
      {ui === "approved" ? <SuccessText message="Ya puedes ver las órdenes en Mis compras." /> : null}
      {checkout.mercadopago.mock && checkout.status === "PENDING_PAYMENT" ? (
        <Button label="Simular pago de prueba" pending={simulate.isPending} onPress={() => simulate.mutate()} />
      ) : null}
      <ErrorText message={simulate.error ? userFacingError(simulate.error) : null} />
      <Button label="Ver mi compra" onPress={() => router.replace("/purchases")} />
    </Screen>
  );
}

export default function CheckoutReturnScreen() {
  return (
    <RequireAuth>
      <ReturnInner />
    </RequireAuth>
  );
}
