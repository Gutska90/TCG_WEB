import { useQuery } from "@tanstack/react-query";
import { PAYMENT_COPY, formatClp } from "@tcg/config";
import { Text } from "react-native";
import { fetchBalance } from "../src/lib/endpoints";
import { userFacingError } from "../src/lib/errors";
import { EmptyState, ErrorText, LoadingState, Screen } from "../src/ui/screen";
import { RequireAuth } from "../src/ui/nav";
import { useColors } from "../src/ui/theme-provider";

function Inner() {
  const colors = useColors();
  const query = useQuery({ queryKey: ["balance"], queryFn: fetchBalance });
  if (query.isLoading) return <Screen title="Saldo"><LoadingState /></Screen>;
  if (query.error) return <Screen title="Saldo"><ErrorText message={userFacingError(query.error)} /></Screen>;
  const row = query.data;
  if (!row) return <EmptyState>Sin saldo.</EmptyState>;
  return (
    <Screen title="Saldo vendedor">
      <Text>Pendiente {formatClp(row.pendingClp)}</Text>
      <Text>Disponible {formatClp(row.availableClp)}</Text>
      <Text>Reservado {formatClp(row.reservedClp)}</Text>
      <Text>Pagado {formatClp(row.paidClp)}</Text>
      <Text>Neto {formatClp(row.netClp)}</Text>
      <Text style={{ color: colors.muted }}>{PAYMENT_COPY.held}</Text>
      <Text style={{ color: colors.muted }}>{PAYMENT_COPY.released}</Text>
    </Screen>
  );
}

export default function BalanceScreen() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}
