import { useQuery } from "@tanstack/react-query";
import { DISPUTE_REASON_LABELS, DISPUTE_STATUS_LABELS } from "@tcg/config";
import { useRouter } from "expo-router";
import { fetchMyDisputes } from "../../src/lib/endpoints";
import { userFacingError } from "../../src/lib/errors";
import { EmptyState, ErrorText, LoadingState, Screen } from "../../src/ui/screen";
import { ListRow } from "../../src/ui/list-row";
import { RequireAuth } from "../../src/ui/nav";

function Inner() {
  const router = useRouter();
  const query = useQuery({ queryKey: ["disputes"], queryFn: fetchMyDisputes });
  if (query.isLoading) return <Screen title="Reclamos"><LoadingState /></Screen>;
  if (query.error) return <Screen title="Reclamos"><ErrorText message={userFacingError(query.error)} /></Screen>;
  return (
    <Screen title="Reclamos">
      {query.data?.items.length === 0 ? <EmptyState>No hay reclamos abiertos.</EmptyState> : null}
      {query.data?.items.map((row) => (
        <ListRow
          key={row.id}
          title={row.orderNumber}
          subtitle={`${DISPUTE_REASON_LABELS[row.reason]} · ${DISPUTE_STATUS_LABELS[row.status]}`}
          onPress={() => router.push(`/disputes/${row.id}`)}
        />
      ))}
    </Screen>
  );
}

export default function DisputesScreen() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}
