import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CARD_CONDITION_LABELS, formatClp } from "@tcg/config";
import type { CartView } from "@tcg/types";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import { fetchCart, putCartItem, removeCartItem } from "../../src/lib/endpoints";
import { useAuth } from "../../src/lib/auth";
import { userFacingError } from "../../src/lib/errors";
import { Button, EmptyState, ErrorText, LoadingState, Screen } from "../../src/ui/screen";
import { TextLink } from "../../src/ui/nav";
import { useColors } from "../../src/ui/theme-provider";

const ISSUE_COPY: Record<NonNullable<CartView["items"][number]["issue"]>, string> = {
  LISTING_NOT_ACTIVE: "Esta publicación ya no está activa.",
  LISTING_INSUFFICIENT_STOCK: "El stock cambió. Baja la cantidad o quítala.",
  OWN_LISTING: "Es tu publicación; no se incluye en el total.",
};

export default function CartScreen() {
  const colors = useColors();
  const { me } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const cart = useQuery({ queryKey: ["cart"], queryFn: fetchCart, enabled: Boolean(me) });
  const mutate = useMutation({
    mutationFn: ({ listingId, quantity }: { listingId: string; quantity: number }) =>
      quantity < 1 ? removeCartItem(listingId) : putCartItem(listingId, quantity),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["cart"] }),
  });

  if (!me) {
    return (
      <Screen title="Carrito">
        <EmptyState>Ingresa para usar el carrito. En mobile el carrito va ligado a tu cuenta.</EmptyState>
        <TextLink href="/login" label="Ingresar" />
      </Screen>
    );
  }
  if (cart.isLoading) return <Screen title="Carrito"><LoadingState /></Screen>;
  if (cart.error) return <Screen title="Carrito"><ErrorText message={userFacingError(cart.error)} /></Screen>;
  const data = cart.data;
  if (!data || data.itemCount === 0) {
    return (
      <Screen title="Carrito">
        <EmptyState>Tu carrito está vacío.</EmptyState>
        <TextLink href="/search" label="Buscar cartas" />
      </Screen>
    );
  }

  return (
    <Screen title="Carrito">
      {data.groups.map((group) => (
        <View key={group.seller.id} style={{ marginBottom: 16, gap: 8 }}>
          <Text style={{ fontWeight: "600" }}>{group.seller.displayName}</Text>
          {group.items.map((item) => (
            <View key={item.listingId} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, gap: 6 }}>
              <Text>{item.listing.title}</Text>
              <Text style={{ color: colors.muted, fontSize: 13 }}>
                {item.listing.condition} · {CARD_CONDITION_LABELS[item.listing.condition]} · {formatClp(item.listing.priceClp)}
              </Text>
              {item.issue ? <Text style={{ color: colors.danger }}>{ISSUE_COPY[item.issue]}</Text> : null}
              <Text>Cantidad {item.quantity} · {formatClp(item.lineTotalClp)}</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Button
                  variant="secondary"
                  label="Menos"
                  disabled={mutate.isPending}
                  onPress={() => mutate.mutate({ listingId: item.listingId, quantity: item.quantity - 1 })}
                />
                <Button
                  variant="secondary"
                  label="Más"
                  disabled={mutate.isPending || item.quantity >= item.listing.available}
                  onPress={() => mutate.mutate({ listingId: item.listingId, quantity: item.quantity + 1 })}
                />
                <Button
                  variant="secondary"
                  label="Quitar"
                  disabled={mutate.isPending}
                  onPress={() => mutate.mutate({ listingId: item.listingId, quantity: 0 })}
                />
              </View>
            </View>
          ))}
          <Text>Subtotal {formatClp(group.subtotalClp)}</Text>
        </View>
      ))}
      <Text>Productos {formatClp(data.productTotalClp)}</Text>
      <Text style={{ color: colors.muted }}>El envío se calcula al pagar. El total lo confirma el servidor.</Text>
      <ErrorText message={mutate.error ? userFacingError(mutate.error) : null} />
      <Button label="Ir a pagar" onPress={() => router.push("/checkout")} />
    </Screen>
  );
}
