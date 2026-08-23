import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatClp } from "@tcg/config";
import { useRouter } from "expo-router";
import { Text } from "react-native";
import { fetchWishlist, removeWishlistItem } from "../../src/lib/endpoints";
import { useAuth } from "../../src/lib/auth";
import { userFacingError } from "../../src/lib/errors";
import { Button, EmptyState, ErrorText, LoadingState, Screen } from "../../src/ui/screen";
import { ListRow } from "../../src/ui/list-row";
import { TextLink } from "../../src/ui/nav";
import { useColors } from "../../src/ui/theme-provider";

export default function WishlistScreen() {
  const { me } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const colors = useColors();
  const query = useQuery({
    queryKey: ["wishlist"],
    queryFn: fetchWishlist,
    enabled: Boolean(me),
  });
  const remove = useMutation({
    mutationFn: removeWishlistItem,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["wishlist"] }),
  });

  if (!me) {
    return (
      <Screen title="Wishlist">
        <EmptyState>Ingresa para ver tu wishlist.</EmptyState>
        <TextLink href="/login" label="Ingresar" />
      </Screen>
    );
  }
  if (query.isLoading) return <Screen title="Wishlist"><LoadingState /></Screen>;
  if (query.error) return <Screen title="Wishlist"><ErrorText message={userFacingError(query.error)} /></Screen>;

  return (
    <Screen title="Wishlist">
      <Text style={{ color: colors.muted, fontSize: 13 }}>
        Cartas que quieres, con precio máximo. No es tu colección ni un favorito.
      </Text>
      {query.data?.items.length === 0 ? <EmptyState>Aún no hay cartas en tu wishlist.</EmptyState> : null}
      {query.data?.items.map((item) => (
        <ListRow
          key={item.id}
          title={item.hit ? `${item.card.name} · Objetivo alcanzado` : item.card.name}
          subtitle={`Objetivo ${formatClp(item.targetPriceClp)} · ${
            item.currentMinClp != null ? formatClp(item.currentMinClp) : "Sin listings"
          }`}
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
          onPress={() => remove.mutate(item.variantId)}
        />
      ))}
      <ErrorText message={remove.error ? userFacingError(remove.error) : null} />
    </Screen>
  );
}
