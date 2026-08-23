import { useQuery } from "@tanstack/react-query";
import { formatClp } from "@tcg/config";
import { useRouter } from "expo-router";
import { Text } from "react-native";
import { fetchCollectionItems, fetchCollectionSets, fetchCollectionSummary } from "../../../src/lib/endpoints";
import { useAuth } from "../../../src/lib/auth";
import { userFacingError } from "../../../src/lib/errors";
import { EmptyState, ErrorText, LoadingState, Screen } from "../../../src/ui/screen";
import { ListRow } from "../../../src/ui/list-row";
import { TextLink } from "../../../src/ui/nav";
import { useColors } from "../../../src/ui/theme-provider";

export default function CollectionHomeScreen() {
  const colors = useColors();
  const { me } = useAuth();
  const router = useRouter();
  const summary = useQuery({
    queryKey: ["collection-summary"],
    queryFn: fetchCollectionSummary,
    enabled: Boolean(me),
  });
  const items = useQuery({
    queryKey: ["collection-items"],
    queryFn: () => fetchCollectionItems(new URLSearchParams({ pageSize: "40", sort: "recent" })),
    enabled: Boolean(me),
  });
  const sets = useQuery({
    queryKey: ["collection-sets"],
    queryFn: fetchCollectionSets,
    enabled: Boolean(me),
  });

  if (!me) {
    return (
      <Screen title="Colección">
        <EmptyState>Ingresa para ver tu colección.</EmptyState>
        <TextLink href="/login" label="Ingresar" />
      </Screen>
    );
  }
  if (summary.isLoading || items.isLoading) {
    return (
      <Screen title="Colección">
        <LoadingState />
      </Screen>
    );
  }
  if (summary.error) {
    return (
      <Screen title="Colección">
        <ErrorText message={userFacingError(summary.error)} />
      </Screen>
    );
  }
  const data = summary.data;
  if (!data) return null;

  return (
    <Screen title="Colección">
      <Text style={{ color: colors.muted, fontSize: 13 }}>{data.disclaimer}</Text>
      <Text>Total {data.totalCards} · Únicas {data.uniqueCards}</Text>
      <Text>Valor estimado {data.estimatedValueClp != null ? formatClp(data.estimatedValueClp) : "Sin precio suficiente"}</Text>
      <Text>
        30 días{" "}
        {data.change30dClp == null
          ? "Sin historial suficiente"
          : `${data.change30dClp >= 0 ? "+" : ""}${formatClp(data.change30dClp)}`}
      </Text>
      <Text>
        Costo {data.registeredCostClp != null ? formatClp(data.registeredCostClp) : "Sin costo registrado"}
        {data.itemsWithoutCost ? ` · ${data.itemsWithoutCost} sin costo` : ""}
      </Text>
      <Text>P/L {data.estimatedPlClp != null ? formatClp(data.estimatedPlClp) : "Sin precio suficiente"}</Text>
      <Text>
        Duplicados {data.duplicateCards} cartas / {data.extraCopies} copias extra
      </Text>
      {items.data?.items.length === 0 ? (
        <>
          <EmptyState>Aún no tienes cartas en tu colección.</EmptyState>
          <Text style={{ color: colors.muted }}>
            Agrega tus cartas para llevar registro de cantidad, costo y valor estimado.
          </Text>
          <TextLink href="/(tabs)/search" label="Buscar cartas" />
        </>
      ) : (
        items.data?.items.map((item) => (
          <ListRow
            key={item.id}
            title={item.variant.card.name}
            subtitle={`${item.variant.card.setSlug} · ${item.condition} · ×${item.quantity}`}
            imageUrl={item.variant.card.imageUrl}
            right={item.estimatedValueClp != null ? formatClp(item.estimatedValueClp) : "—"}
            onPress={() => router.push(`/collection/${item.id}`)}
          />
        ))
      )}
      {sets.data && sets.data.length > 0 ? <Text style={{ fontWeight: "700", marginTop: 12 }}>Progreso por set</Text> : null}
      {sets.data?.map((row) => (
        <ListRow
          key={row.setId}
          title={row.setName}
          subtitle={`${row.ownedUnique} / ${row.total} · ${row.percentage}%`}
          onPress={() => router.push(`/collection/sets/${row.setId}`)}
        />
      ))}
    </Screen>
  );
}
