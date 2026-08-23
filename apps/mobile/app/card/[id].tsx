import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CARD_CONDITIONS, PRICE_CONFIDENCE_LABELS, formatClp, formatReputation } from "@tcg/config";
import type { CardCondition } from "@tcg/config";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Image, Modal, Pressable, Text, View } from "react-native";
import { track } from "../../src/lib/analytics";
import { addCollectionItem, addFavorite, fetchCard, fetchListings, fetchVariantPrices, upsertWishlistItem } from "../../src/lib/endpoints";
import { useAuth } from "../../src/lib/auth";
import { userFacingError } from "../../src/lib/errors";
import { Button, EmptyState, ErrorText, LoadingState, Screen, SuccessText } from "../../src/ui/screen";
import { Field } from "../../src/ui/field";
import { useColors } from "../../src/ui/theme-provider";
import { useEffect } from "react";

export default function CardScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { me } = useAuth();
  const qc = useQueryClient();
  const [variantId, setVariantId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [condition, setCondition] = useState<CardCondition>("NM");
  const [quantity, setQuantity] = useState("1");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [notes, setNotes] = useState("");
  const [wishOpen, setWishOpen] = useState(false);
  const [wishTarget, setWishTarget] = useState("");
  const card = useQuery({ queryKey: ["card", id], queryFn: () => fetchCard(id), enabled: Boolean(id) });
  const current = variantId ?? card.data?.variants.find((row) => row.isDefault)?.id ?? card.data?.variants[0]?.id;
  const listings = useQuery({
    queryKey: ["listings", "variant", current],
    queryFn: () => fetchListings(new URLSearchParams({ variantId: current ?? "", pageSize: "40" })),
    enabled: Boolean(current),
  });
  const prices = useQuery({
    queryKey: ["prices", current],
    queryFn: () => fetchVariantPrices(current!),
    enabled: Boolean(current),
  });
  const addCol = useMutation({
    mutationFn: () =>
      addCollectionItem({
        variantId: current!,
        condition,
        quantity: Number(quantity),
        ...(purchasePrice.trim() ? { purchasePriceClp: Number(purchasePrice) } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      }),
    onSuccess: () => {
      track("collection_item_added", { quantity: Number(quantity) });
      setSheetOpen(false);
      setNotice("Agregada a tu colección.");
      void qc.invalidateQueries({ queryKey: ["collection-summary"] });
      void qc.invalidateQueries({ queryKey: ["collection-items"] });
    },
  });
  const fav = useMutation({
    mutationFn: () => addFavorite(current!),
    onSuccess: () => {
      setNotice("Guardada en favoritos.");
      void qc.invalidateQueries({ queryKey: ["favorites"] });
    },
  });
  const wish = useMutation({
    mutationFn: () => upsertWishlistItem(current!, Number(wishTarget)),
    onSuccess: () => {
      setWishOpen(false);
      setNotice("Guardada en wishlist.");
      void qc.invalidateQueries({ queryKey: ["wishlist"] });
    },
  });

  useEffect(() => {
    if (card.data) track("card_view", { hasImage: Boolean(card.data.imageUrl) });
  }, [card.data]);

  if (card.isLoading) return <Screen title="Carta"><LoadingState /></Screen>;
  if (card.error) return <Screen title="Carta"><ErrorText message={userFacingError(card.error)} /></Screen>;
  const detail = card.data;
  if (!detail) return null;

  return (
    <Screen title={detail.name}>
      {detail.imageUrl ? (
        <Image source={{ uri: detail.imageUrl }} style={{ width: "100%", height: 220, borderRadius: 8, backgroundColor: colors.fill }} accessibilityLabel={detail.name} />
      ) : (
        <View style={{ height: 120, backgroundColor: colors.fill, borderRadius: 8, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: colors.muted }}>Sin imagen</Text>
        </View>
      )}
      <Text style={{ color: colors.muted }}>
        {detail.set.name} · {detail.number} · {detail.rarity}
      </Text>
      <Text>
        Precio orientativo {detail.market.minListing != null ? formatClp(detail.market.minListing) : "—"} · {detail.market.activeListings} publicaciones
      </Text>
      {prices.data ? (
        <>
          <Text style={{ fontWeight: "600", marginTop: 8 }}>Historial de precios</Text>
          <Text>
            Índice TCG Market Chile {prices.data.current != null ? formatClp(prices.data.current) : "Sin precio suficiente"}
          </Text>
          <Text>
            Última venta {prices.data.lastSaleClp != null ? formatClp(prices.data.lastSaleClp) : "Sin ventas suficientes"}
          </Text>
          <Text>
            Confianza {prices.data.confidence ? PRICE_CONFIDENCE_LABELS[prices.data.confidence] : "Sin ventas suficientes"}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>{prices.data.disclaimer}</Text>
        </>
      ) : null}
      {detail.variants.length > 1
        ? detail.variants.map((variant) => (
            <Pressable
              key={variant.id}
              accessibilityRole="button"
              accessibilityState={{ selected: variant.id === current }}
              onPress={() => setVariantId(variant.id)}
              style={{ paddingVertical: 10 }}
            >
              <Text style={{ fontWeight: variant.id === current ? "700" : "400" }}>
                {variant.language} · {variant.finish}
              </Text>
            </Pressable>
          ))
        : null}
      <Button
        variant="secondary"
        label="Agregar a colección"
        disabled={!me || !current}
        onPress={() => setSheetOpen(true)}
      />
      <Button
        variant="secondary"
        label="Añadir a wishlist"
        disabled={!me || !current}
        onPress={() => setWishOpen(true)}
      />
      <Button
        variant="secondary"
        label="Guardar en favoritos"
        disabled={!me || !current}
        pending={fav.isPending}
        onPress={() => fav.mutate()}
      />
      <SuccessText message={notice} />
      <ErrorText message={fav.error ? userFacingError(fav.error) : wish.error ? userFacingError(wish.error) : null} />
      <Text style={{ fontWeight: "600", marginTop: 8 }}>Publicaciones</Text>
      {listings.isLoading ? <LoadingState /> : null}
      {listings.data?.items.length === 0 ? <EmptyState>Nadie publica esta variante aún.</EmptyState> : null}
      {listings.data?.items.map((item) => (
        <Pressable
          key={item.id}
          accessibilityRole="button"
          accessibilityLabel={`Ver publicación de ${item.seller.displayName}`}
          onPress={() => router.push(`/listing/${item.id}`)}
          style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: colors.border }}
        >
          <Text>
            {item.seller.displayName} · {formatReputation(item.seller.reputation.averageStars, item.seller.reputation.count)}
          </Text>
          <Text>
            {item.condition} · {formatClp(item.priceClp)} · {item.available} disp.
          </Text>
        </Pressable>
      ))}
      <Button
        label="Ver publicaciones"
        onPress={() => current && listings.data?.items[0] && router.push(`/listing/${listings.data.items[0].id}`)}
        disabled={!listings.data?.items[0]}
      />
      <Modal visible={sheetOpen} animationType="slide" transparent>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.35)" }}>
          <View style={{ backgroundColor: "#fff", padding: 16, borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
            <Text style={{ fontWeight: "700", fontSize: 18 }}>Agregar a colección</Text>
            {CARD_CONDITIONS.map((value) => (
              <Button
                key={value}
                variant={condition === value ? "primary" : "secondary"}
                label={value}
                onPress={() => setCondition(value)}
              />
            ))}
            <Field label="Cantidad" value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
            <Field label="Precio de compra CLP" value={purchasePrice} onChangeText={setPurchasePrice} keyboardType="numeric" />
            <Field label="Notas" value={notes} onChangeText={setNotes} multiline />
            <ErrorText message={addCol.error ? userFacingError(addCol.error) : null} />
            <Button
              label="Guardar en colección"
              pending={addCol.isPending}
              disabled={!current || addCol.isPending}
              onPress={() => addCol.mutate()}
            />
            <Button variant="secondary" label="Cancelar" onPress={() => setSheetOpen(false)} />
          </View>
        </View>
      </Modal>
      <Modal visible={wishOpen} animationType="slide" transparent>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.35)" }}>
          <View style={{ backgroundColor: "#fff", padding: 16, borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
            <Text style={{ fontWeight: "700", fontSize: 18 }}>Precio objetivo</Text>
            <Field label="Precio máximo CLP" value={wishTarget} onChangeText={setWishTarget} keyboardType="numeric" />
            <ErrorText message={wish.error ? userFacingError(wish.error) : null} />
            <Button
              label="Guardar"
              pending={wish.isPending}
              disabled={!current || Number(wishTarget) < 1}
              onPress={() => wish.mutate()}
            />
            <Button variant="secondary" label="Cancelar" onPress={() => setWishOpen(false)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
