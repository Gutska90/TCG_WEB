import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createAddressSchema } from "@tcg/validation";
import { useState } from "react";
import { Text } from "react-native";
import { api } from "../src/lib/api";
import { fetchAddresses } from "../src/lib/endpoints";
import { userFacingError } from "../src/lib/errors";
import { Button, EmptyState, ErrorText, LoadingState, Screen, SuccessText } from "../src/ui/screen";
import { Field } from "../src/ui/field";
import { RequireAuth } from "../src/ui/nav";

function Inner() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["addresses"], queryFn: fetchAddresses });
  const [recipientName, setRecipientName] = useState("");
  const [phone, setPhone] = useState("");
  const [line1, setLine1] = useState("");
  const [comuna, setComuna] = useState("");
  const [region, setRegion] = useState("Metropolitana");
  const [notice, setNotice] = useState<string | null>(null);
  const create = useMutation({
    mutationFn: () => {
      const parsed = createAddressSchema.safeParse({
        label: "Principal",
        recipientName,
        phone,
        line1,
        comuna,
        region,
        isDefaultShipping: true,
      });
      if (!parsed.success) throw new Error("invalid");
      return api("/v1/me/addresses", { method: "POST", body: JSON.stringify(parsed.data) });
    },
    onSuccess: () => {
      setNotice("Dirección guardada.");
      void qc.invalidateQueries({ queryKey: ["addresses"] });
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/v1/me/addresses/${id}`, { method: "DELETE" }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["addresses"] }),
  });

  if (query.isLoading) return <Screen title="Direcciones"><LoadingState /></Screen>;
  if (query.error) return <Screen title="Direcciones"><ErrorText message={userFacingError(query.error)} /></Screen>;

  return (
    <Screen title="Direcciones">
      {query.data?.length === 0 ? <EmptyState>No hay direcciones.</EmptyState> : null}
      {query.data?.map((row) => (
        <Text key={row.id}>
          {row.label}: {row.line1}, {row.comuna}
        </Text>
      ))}
      {query.data?.map((row) => (
        <Button key={`rm-${row.id}`} variant="secondary" label={`Eliminar ${row.label}`} onPress={() => remove.mutate(row.id)} />
      ))}
      <Field label="Nombre" value={recipientName} onChangeText={setRecipientName} autoCapitalize="words" />
      <Field label="Teléfono" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Field label="Dirección" value={line1} onChangeText={setLine1} autoCapitalize="sentences" />
      <Field label="Comuna" value={comuna} onChangeText={setComuna} />
      <Field label="Región" value={region} onChangeText={setRegion} />
      <Button label="Guardar dirección" pending={create.isPending} onPress={() => create.mutate()} />
      <SuccessText message={notice} />
      <ErrorText message={create.error ? userFacingError(create.error) : null} />
    </Screen>
  );
}

export default function AddressesScreen() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}
