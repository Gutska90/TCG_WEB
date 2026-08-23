import { formatClp, formatFeePercentEsCl } from "@tcg/config";
import { useQuery } from "@tanstack/react-query";
import { Text } from "react-native";
import type { SellerPlanView } from "@tcg/types";
import { api } from "../src/lib/api";
import { Screen, EmptyState } from "../src/ui/screen";
import { TextLink } from "../src/ui/nav";
import { RequireAuth } from "../src/ui/nav";
import { useColors } from "../src/ui/theme-provider";

function Inner() {
  const colors = useColors();
  const query = useQuery({
    queryKey: ["seller-plan"],
    queryFn: () => api<SellerPlanView>("/v1/me/seller-plan"),
  });

  if (query.isLoading) {
    return (
      <Screen title="Tu plan">
        <Text style={{ color: colors.muted }}>Cargando…</Text>
      </Screen>
    );
  }
  if (!query.data) {
    return (
      <Screen title="Tu plan">
        <EmptyState>No se pudo cargar el plan.</EmptyState>
      </Screen>
    );
  }

  const plan = query.data;
  return (
    <Screen title="Tu plan">
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: "600" }}>{plan.plan}</Text>
      <Text style={{ color: colors.muted, marginTop: 8 }}>
        {formatClp(plan.monthlyPriceClp)} / mes · comisión normal {formatFeePercentEsCl(plan.normalFeeBps)} · tope{" "}
        {formatClp(plan.normalFeeCapClp)}
      </Text>
      {plan.promotion.active ? (
        <Text style={{ color: colors.text, marginTop: 12 }}>
          Promoción {plan.promotion.code}: {formatFeePercentEsCl(plan.promotion.effectiveFeeBps)} hasta{" "}
          {plan.promotion.endsAt ? new Date(plan.promotion.endsAt).toLocaleDateString("es-CL") : "el fin de la promo"}.
        </Text>
      ) : null}
      <Text style={{ color: colors.muted, marginTop: 12 }}>{plan.billing.message}</Text>
      <Text style={{ color: colors.muted, marginTop: 8 }}>
        Disponible durante beta mediante invitación. No hay compra de plan dentro de la app.
      </Text>
      <TextLink href="/legal/marketplace" label="Ver planes (web)" />
    </Screen>
  );
}

export default function SellerPlanScreen() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}
