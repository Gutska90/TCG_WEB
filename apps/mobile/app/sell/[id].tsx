import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CARD_CONDITIONS, formatClp } from "@tcg/config";
import type { CardCondition } from "@tcg/config";
import { patchListingSchema } from "@tcg/validation";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Text } from "react-native";
import { api } from "../../src/lib/api";
import { fetchListing } from "../../src/lib/endpoints";
import { userFacingError } from "../../src/lib/errors";
import { Button, ErrorText, LoadingState, Screen, SuccessText } from "../../src/ui/screen";
import { Field } from "../../src/ui/field";
import { RequireAuth } from "../../src/ui/nav";

function Inner() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["listing", id], queryFn: () => fetchListing(id), enabled: Boolean(id) });
  const [condition, setCondition] = useState<CardCondition>("NM");
  const [quantity, setQuantity] = useState("1");
  const [priceClp, setPriceClp] = useState("1000");
  const [description, setDescription] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!query.data) return;
    setCondition(query.data.condition);
    setQuantity(String(query.data.quantity));
    setPriceClp(String(query.data.priceClp));
    setDescription(query.data.description);
  }, [query.data]);

  const save = useMutation({
    mutationFn: () => {
      const parsed = patchListingSchema.safeParse({
        condition,
        quantity: Number(quantity),
        priceClp: Number(priceClp),
        description,
      });
      if (!parsed.success) throw new Error("invalid");
      return api(`/v1/listings/${id}`, { method: "PATCH", body: JSON.stringify(parsed.data) });
    },
    onSuccess: () => {
      setNotice("Publicación actualizada.");
      void qc.invalidateQueries({ queryKey: ["listing", id] });
      void qc.invalidateQueries({ queryKey: ["my-listings"] });
    },
  });

  if (query.isLoading) return <Screen title="Editar"><LoadingState /></Screen>;
  if (query.error) return <Screen title="Editar"><ErrorText message={userFacingError(query.error)} /></Screen>;
  const row = query.data;
  if (!row) return null;

  return (
    <Screen title={row.title}>
      <Text>
        {row.status} · {formatClp(row.priceClp)}
      </Text>
      {CARD_CONDITIONS.map((value) => (
        <Button key={value} variant={condition === value ? "primary" : "secondary"} label={value} onPress={() => setCondition(value)} />
      ))}
      <Field label="Stock" value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
      <Field label="Precio CLP" value={priceClp} onChangeText={setPriceClp} keyboardType="numeric" />
      <Field label="Descripción" value={description} onChangeText={setDescription} multiline />
      <Button label="Guardar" pending={save.isPending} onPress={() => save.mutate()} />
      <SuccessText message={notice} />
      <ErrorText message={save.error ? userFacingError(save.error) : null} />
    </Screen>
  );
}

export default function SellEditScreen() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}
