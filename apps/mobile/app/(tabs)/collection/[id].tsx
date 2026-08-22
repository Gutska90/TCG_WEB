import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CARD_CONDITIONS, formatClp } from "@tcg/config";
import type { CardCondition } from "@tcg/config";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text } from "react-native";
import { track } from "../../../src/lib/analytics";
import { deleteCollectionItem, fetchCollectionItem, patchCollectionItem } from "../../../src/lib/endpoints";
import { userFacingError } from "../../../src/lib/errors";
import { Button, ErrorText, LoadingState, Screen, SuccessText } from "../../../src/ui/screen";
import { Field } from "../../../src/ui/field";
import { RequireAuth } from "../../../src/ui/nav";
import { colors } from "../../../src/ui/theme";

function Inner() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const item = useQuery({
    queryKey: ["collection-item", id],
    queryFn: () => fetchCollectionItem(id!),
    enabled: Boolean(id),
  });
  const [quantity, setQuantity] = useState("");
  const [condition, setCondition] = useState<CardCondition>("NM");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!item.data) return;
    setQuantity(String(item.data.quantity));
    setCondition(item.data.condition);
    setPrice(item.data.purchasePriceClp != null ? String(item.data.purchasePriceClp) : "");
    setNotes(item.data.notes ?? "");
  }, [item.data]);

  const save = useMutation({
    mutationFn: () =>
      patchCollectionItem(id!, {
        quantity: Number(quantity),
        condition,
        purchasePriceClp: price.trim() === "" ? null : Number(price),
        notes: notes.trim() === "" ? null : notes.trim(),
      }),
    onSuccess: () => {
      track("collection_item_updated");
      setNotice("Ítem actualizado.");
      void qc.invalidateQueries({ queryKey: ["collection-item", id] });
      void qc.invalidateQueries({ queryKey: ["collection-summary"] });
      void qc.invalidateQueries({ queryKey: ["collection-items"] });
    },
  });
  const remove = useMutation({
    mutationFn: () => deleteCollectionItem(id!),
    onSuccess: () => {
      track("collection_item_removed");
      void qc.invalidateQueries({ queryKey: ["collection-summary"] });
      void qc.invalidateQueries({ queryKey: ["collection-items"] });
      router.replace("/collection");
    },
  });

  if (item.isLoading) {
    return (
      <Screen title="Ítem">
        <LoadingState />
      </Screen>
    );
  }
  if (item.error || !item.data) {
    return (
      <Screen title="Ítem">
        <ErrorText message={item.error ? userFacingError(item.error) : "No encontrado"} />
      </Screen>
    );
  }
  const row = item.data;

  return (
    <Screen title={row.variant.card.name}>
      <Text style={{ color: colors.muted }}>
        {row.variant.card.setSlug} · {row.variant.card.number} · {row.condition}
      </Text>
      <Text>
        Estimado {row.estimatedValueClp != null ? formatClp(row.estimatedValueClp) : "Sin precio suficiente"}
      </Text>
      <Text>Costo {row.registeredCostClp != null ? formatClp(row.registeredCostClp) : "Sin costo"}</Text>
      {CARD_CONDITIONS.map((value) => (
        <Button
          key={value}
          variant={condition === value ? "primary" : "secondary"}
          label={value}
          onPress={() => setCondition(value)}
        />
      ))}
      <Field label="Cantidad" value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
      <Field label="Precio de compra CLP" value={price} onChangeText={setPrice} keyboardType="numeric" />
      <Field label="Notas" value={notes} onChangeText={setNotes} multiline />
      <ErrorText message={save.error ? userFacingError(save.error) : null} />
      <SuccessText message={notice} />
      <Button label="Guardar cambios" pending={save.isPending} onPress={() => save.mutate()} />
      <Button
        variant="secondary"
        label="Vender"
        onPress={() => {
          track("collection_sell_clicked");
          router.push(
            `/sell/new?variantId=${row.variantId}&condition=${row.condition}&quantity=${row.quantity}&collectionItemId=${row.id}`,
          );
        }}
      />
      <Button variant="secondary" label="Eliminar" pending={remove.isPending} onPress={() => remove.mutate()} />
    </Screen>
  );
}

export default function CollectionItemScreen() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}
