import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { Text } from "react-native";
import { track } from "../../../../src/lib/analytics";
import { fetchCollectionSet } from "../../../../src/lib/endpoints";
import { userFacingError } from "../../../../src/lib/errors";
import { Button, EmptyState, ErrorText, LoadingState, Screen } from "../../../../src/ui/screen";
import { ListRow } from "../../../../src/ui/list-row";
import { RequireAuth } from "../../../../src/ui/nav";
import { useColors } from "../../../../src/ui/theme-provider";

function Inner() {
  const colors = useColors();
  const { setId } = useLocalSearchParams<{ setId: string }>();
  const router = useRouter();
  const detail = useQuery({
    queryKey: ["collection-set", setId],
    queryFn: () => fetchCollectionSet(setId!),
    enabled: Boolean(setId),
  });

  useEffect(() => {
    if (detail.data) track("set_progress_viewed");
  }, [detail.data]);

  if (detail.isLoading) {
    return (
      <Screen title="Set">
        <LoadingState />
      </Screen>
    );
  }
  if (detail.error || !detail.data) {
    return (
      <Screen title="Set">
        <ErrorText message={detail.error ? userFacingError(detail.error) : "No encontrado"} />
      </Screen>
    );
  }
  const { progress, missing } = detail.data;

  return (
    <Screen title={progress.setName}>
      <Text>
        {progress.ownedUnique} / {progress.total} · {progress.percentage}%
      </Text>
      <Text style={{ color: colors.muted }}>
        Te faltan {progress.missing} · {progress.missingWithActiveListings} con publicaciones
      </Text>
      {progress.missing > 0 ? (
        <Button label="Ver disponibles" onPress={() => router.push("/(tabs)/search")} />
      ) : (
        <EmptyState>Set completo en tu colección.</EmptyState>
      )}
      <Text style={{ fontWeight: "700", marginTop: 12 }}>Faltantes</Text>
      {missing.items.length === 0 ? <EmptyState>No te falta ninguna carta de este set.</EmptyState> : null}
      {missing.items.map((card) => (
        <ListRow
          key={card.cardId}
          title={card.name}
          subtitle={`${card.number}${card.hasActiveListing ? " · con publicaciones" : ""}`}
          imageUrl={card.imageUrl}
          onPress={() => router.push(`/card/${card.cardId}`)}
        />
      ))}
    </Screen>
  );
}

export default function CollectionSetScreen() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}
