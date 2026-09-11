import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CARD_CONDITION_LABELS, formatClp, whatsappMeHref } from "@tcg/config";
import type { CartView } from "@tcg/types";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Image, Text, View } from "react-native";
import { fetchCart, putCartItem, removeCartItem, createInquiry } from "../../src/lib/endpoints";
import { useAuth } from "../../src/lib/auth";
import { userFacingError } from "../../src/lib/errors";
import { openWhatsappHref } from "../../src/lib/whatsapp";
import { Button, EmptyState, ErrorText, LoadingState, Screen } from "../../src/ui/screen";
import { QtyStepper } from "../../src/ui/qty-stepper";
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
  const [consultError, setConsultError] = useState<string | null>(null);
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
            <View key={item.listingId} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, gap: 8 }}>
              <View style={{ width: "100%", height: 220, borderRadius: 8, overflow: "hidden", backgroundColor: "#111", justifyContent: "flex-end" }}>
                {item.listing.variant.card.imageUrl ? (
                  <Image
                    source={{ uri: item.listing.variant.card.imageUrl }}
                    style={{ position: "absolute", width: "100%", height: "100%" }}
                    resizeMode="contain"
                    accessibilityLabel={item.listing.variant.card.name}
                  />
                ) : null}
                <View style={{ alignItems: "center", paddingBottom: 8 }}>
                  <QtyStepper
                    value={item.quantity}
                    max={Math.max(1, item.listing.available)}
                    disabled={mutate.isPending}
                    onChange={(next) => mutate.mutate({ listingId: item.listingId, quantity: next })}
                  />
                </View>
              </View>
              <Text>{item.listing.title}</Text>
              <Text style={{ color: colors.muted, fontSize: 13 }}>
                {item.listing.condition} · {CARD_CONDITION_LABELS[item.listing.condition]} · {formatClp(item.listing.priceClp)}
              </Text>
              {item.issue ? <Text style={{ color: colors.danger }}>{ISSUE_COPY[item.issue]}</Text> : null}
              <Text>Cantidad {item.quantity} · {formatClp(item.lineTotalClp)}</Text>
              <Button
                variant="secondary"
                label="Quitar"
                disabled={mutate.isPending}
                onPress={() => mutate.mutate({ listingId: item.listingId, quantity: 0 })}
              />
            </View>
          ))}
          <Text>Subtotal {formatClp(group.subtotalClp)}</Text>
          {group.seller.contactWhatsappEnabled && group.seller.contactWhatsapp ? (
            <Button
              variant="secondary"
              label="Consultar lote por WhatsApp"
              disabled={mutate.isPending || !group.items.some((item) => item.purchasable)}
              onPress={() => {
                setConsultError(null);
                void (async () => {
                  try {
                    const inquiry = await createInquiry(group.seller.id);
                    if (!inquiry.seller.contactWhatsapp) {
                      setConsultError("Consulta creada. Este vendedor no tiene WhatsApp público.");
                      return;
                    }
                    await openWhatsappHref(whatsappMeHref(inquiry.seller.contactWhatsapp, inquiry.messageText));
                  } catch (err: unknown) {
                    setConsultError(userFacingError(err));
                  }
                })();
              }}
            />
          ) : null}
          {group.seller.contactWhatsappEnabled && group.seller.contactWhatsapp ? (
            <Text style={{ color: colors.muted, fontSize: 13 }}>
              Consultar no reserva stock. Para tomarlo, paga en la plataforma.
            </Text>
          ) : null}
        </View>
      ))}
      <Text>Productos {formatClp(data.productTotalClp)}</Text>
      <Text style={{ color: colors.muted }}>El envío se calcula al pagar. El total lo confirma el servidor.</Text>
      <ErrorText message={mutate.error ? userFacingError(mutate.error) : consultError} />
      <Button label="Ir a pagar" onPress={() => router.push("/checkout")} />
    </Screen>
  );
}
