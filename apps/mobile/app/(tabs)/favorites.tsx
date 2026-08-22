import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { fetchFavorites, removeFavorite } from "../../src/lib/endpoints";
import { useAuth } from "../../src/lib/auth";
import { userFacingError } from "../../src/lib/errors";
import { Button, EmptyState, ErrorText, LoadingState, Screen } from "../../src/ui/screen";
import { ListRow } from "../../src/ui/list-row";
import { TextLink } from "../../src/ui/nav";

export default function FavoritesScreen() {
  const { me } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["favorites"],
    queryFn: fetchFavorites,
    enabled: Boolean(me),
  });
  const remove = useMutation({
    mutationFn: removeFavorite,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["favorites"] }),
  });

  if (!me) {
    return (
      <Screen title="Favoritos">
        <EmptyState>Ingresa para ver tus favoritos.</EmptyState>
        <TextLink href="/login" label="Ingresar" />
      </Screen>
    );
  }
  if (query.isLoading) return <Screen title="Favoritos"><LoadingState /></Screen>;
  if (query.error) return <Screen title="Favoritos"><ErrorText message={userFacingError(query.error)} /></Screen>;

  return (
    <Screen title="Favoritos">
      {query.data?.items.length === 0 ? <EmptyState>Aún no hay favoritos.</EmptyState> : null}
      {query.data?.items.map((item) => (
        <ListRow
          key={item.id}
          title={item.card.name}
          subtitle={`${item.variant.language} · ${item.variant.finish}`}
          imageUrl={item.card.imageUrl}
          onPress={() => router.push(`/card/${item.card.id}`)}
        />
      ))}
      {query.data?.items.map((item) => (
        <Button
          key={`rm-${item.id}`}
          variant="secondary"
          label={`Quitar ${item.card.name}`}
          pending={remove.isPending}
          onPress={() => remove.mutate(item.variant.id)}
        />
      ))}
      <ErrorText message={remove.error ? userFacingError(remove.error) : null} />
    </Screen>
  );
}
