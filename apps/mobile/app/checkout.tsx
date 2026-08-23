import { useMutation, useQuery } from "@tanstack/react-query";
import { LEGAL, SHIPPING_METHOD_LABELS, formatClp, type ShippingMethod } from "@tcg/config";
import { CARD_CONDITION_LABELS } from "@tcg/config";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { track } from "../src/lib/analytics";
import { clientAllowsRealPayments } from "../src/lib/config";
import { createCheckout, fetchAddresses, fetchCart, fetchConfig, quoteShipping } from "../src/lib/endpoints";
import { useAuth } from "../src/lib/auth";
import { userFacingError } from "../src/lib/errors";
import { Button, EmptyState, ErrorText, LoadingState, SandboxBanner, Screen } from "../src/ui/screen";
import { RequireAuth, TextLink } from "../src/ui/nav";
import { useColors } from "../src/ui/theme-provider";

const METHODS: ShippingMethod[] = ["MEETUP", "CHILEXPRESS", "BLUE_EXPRESS", "COORDINATED"];

function CheckoutInner() {
  const colors = useColors();
  const router = useRouter();
  const { me } = useAuth();
  const cart = useQuery({ queryKey: ["cart"], queryFn: fetchCart });
  const addresses = useQuery({ queryKey: ["addresses"], queryFn: fetchAddresses });
  const config = useQuery({ queryKey: ["config"], queryFn: fetchConfig });
  const [methods, setMethods] = useState<Record<string, ShippingMethod>>({});
  const [addressId, setAddressId] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cart.data) return;
    const initial: Record<string, ShippingMethod> = {};
    for (const group of cart.data.groups) {
      initial[group.seller.id] = group.items.every((item) => item.listing.allowsMeetup) ? "MEETUP" : "CHILEXPRESS";
    }
    setMethods((current) => (Object.keys(current).length ? current : initial));
    const def = addresses.data?.find((row) => row.isDefaultShipping)?.id ?? addresses.data?.[0]?.id ?? "";
    if (def) setAddressId(def);
  }, [cart.data, addresses.data]);

  const sandbox = (config.data?.features.paymentsSandbox ?? true) || !clientAllowsRealPayments();
  const needsAddress = Object.values(methods).some((method) => method !== "MEETUP");
  const dest = addresses.data?.find((row) => row.id === addressId)?.comuna ?? "Santiago";

  const quotes = useQuery({
    queryKey: ["quotes", cart.data?.id, methods, dest],
    enabled: Boolean(cart.data),
    queryFn: async () => {
      const entries = await Promise.all(
        (cart.data?.groups ?? []).map(async (group) => {
          const method = methods[group.seller.id] ?? "MEETUP";
          try {
            return [group.seller.id, await quoteShipping(group.seller.id, method, dest)] as const;
          } catch {
            return [group.seller.id, null] as const;
          }
        }),
      );
      return Object.fromEntries(entries);
    },
  });

  const shippingTotal = useMemo(() => {
    if (!cart.data) return 0;
    return cart.data.groups.reduce((sum, group) => sum + (quotes.data?.[group.seller.id]?.priceClp ?? 0), 0);
  }, [cart.data, quotes.data]);

  const create = useMutation({
    mutationFn: async () => {
      if (!cart.data) throw new Error("cart");
      track("checkout_started");
      return createCheckout(
        cart.data.groups.map((group) => ({
          sellerId: group.seller.id,
          method: methods[group.seller.id] ?? "MEETUP",
          addressId: (methods[group.seller.id] ?? "MEETUP") === "MEETUP" ? undefined : addressId,
        })),
      );
    },
    onSuccess: async (checkout) => {
      if (!sandbox && checkout.mercadopago.initPoint && clientAllowsRealPayments()) {
        await WebBrowser.openBrowserAsync(checkout.mercadopago.initPoint);
      }
      router.replace(`/checkout-return?checkoutId=${checkout.id}`);
    },
    onError: (err) => setError(userFacingError(err)),
  });

  if (cart.isLoading) return <Screen title="Pagar"><LoadingState /></Screen>;
  if (cart.error) return <Screen title="Pagar"><ErrorText message={userFacingError(cart.error)} /></Screen>;
  if (!cart.data || cart.data.itemCount === 0) {
    return (
      <Screen title="Pagar">
        <EmptyState>Tu carrito está vacío.</EmptyState>
        <TextLink href="/(tabs)/search" label="Buscar cartas" />
      </Screen>
    );
  }
  if (!me?.emailVerified) {
    return (
      <Screen title="Pagar">
        <EmptyState>Verifica tu email antes de pagar.</EmptyState>
        <TextLink href="/verify-email" label="Verificar email" />
      </Screen>
    );
  }

  return (
    <Screen title="Pagar">
      <Text style={{ color: colors.muted }}>{LEGAL.betaProductNotice}</Text>
      {sandbox ? <SandboxBanner /> : null}
      {cart.data.groups.map((group) => {
        const method = methods[group.seller.id] ?? "MEETUP";
        const quote = quotes.data?.[group.seller.id];
        return (
          <View key={group.seller.id} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, gap: 6 }}>
            <Text style={{ fontWeight: "600" }}>Vendedor: {group.seller.displayName}</Text>
            {group.items.map((item) => (
              <Text key={item.listingId}>
                {item.listing.title} · {CARD_CONDITION_LABELS[item.listing.condition]} · x{item.quantity} · {formatClp(item.lineTotalClp)}
              </Text>
            ))}
            <Text>Subtotal {formatClp(group.subtotalClp)}</Text>
            {METHODS.filter(
              (option) =>
                (option === "MEETUP" && group.items.every((item) => item.listing.allowsMeetup)) ||
                (option !== "MEETUP" && group.items.every((item) => item.listing.allowsShipping)),
            ).map((option) => (
              <Button
                key={option}
                variant={method === option ? "primary" : "secondary"}
                label={SHIPPING_METHOD_LABELS[option]}
                onPress={() => setMethods((current) => ({ ...current, [group.seller.id]: option }))}
              />
            ))}
            <Text>Envío: {quote ? formatClp(quote.priceClp) : "Sin tarifa para este destino"}</Text>
          </View>
        );
      })}
      {needsAddress ? (
        addresses.data?.length ? (
          addresses.data.map((row) => (
            <Button
              key={row.id}
              variant={addressId === row.id ? "primary" : "secondary"}
              label={`${row.label}: ${row.line1}, ${row.comuna}`}
              onPress={() => setAddressId(row.id)}
            />
          ))
        ) : (
          <TextLink href="/addresses" label="Agregar dirección" />
        )
      ) : null}
      <Text>Productos {formatClp(cart.data.productTotalClp)}</Text>
      <Text>Envío {formatClp(shippingTotal)}</Text>
      <Text style={{ fontWeight: "700" }}>Total {formatClp(cart.data.productTotalClp + shippingTotal)}</Text>
      <ErrorText message={error} />
      <Button
        label={sandbox ? "Confirmar pago de prueba" : "Confirmar y pagar"}
        pending={create.isPending}
        disabled={needsAddress && !addressId}
        onPress={() => create.mutate()}
      />
    </Screen>
  );
}

export default function CheckoutScreen() {
  return (
    <RequireAuth>
      <CheckoutInner />
    </RequireAuth>
  );
}
