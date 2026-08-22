import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DISPUTE_EVIDENCE_TYPES, DISPUTE_REASON_LABELS, DISPUTE_STATUS_LABELS } from "@tcg/config";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text } from "react-native";
import { api } from "../../src/lib/api";
import { fetchDispute } from "../../src/lib/endpoints";
import { createDeferredFile } from "../../src/lib/files";
import { userFacingError } from "../../src/lib/errors";
import { Button, EmptyState, ErrorText, LoadingState, Screen, SuccessText } from "../../src/ui/screen";
import { Field } from "../../src/ui/field";
import { RequireAuth } from "../../src/ui/nav";
import { colors } from "../../src/ui/theme";

function Inner() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const query = useQuery({ queryKey: ["dispute", id], queryFn: () => fetchDispute(id), enabled: Boolean(id) });
  const send = useMutation({
    mutationFn: () => api(`/v1/disputes/${id}/messages`, { method: "POST", body: JSON.stringify({ body }) }),
    onSuccess: () => {
      setBody("");
      setNotice("Mensaje enviado.");
      void qc.invalidateQueries({ queryKey: ["dispute", id] });
    },
  });
  const evidence = useMutation({
    mutationFn: async () => {
      const fileId = await createDeferredFile("DISPUTE_EVIDENCE");
      return api(`/v1/disputes/${id}/evidence`, {
        method: "POST",
        body: JSON.stringify({ fileId, evidenceType: DISPUTE_EVIDENCE_TYPES[0], description: "Evidencia beta (archivo diferido)" }),
      });
    },
    onSuccess: () => {
      setNotice("Evidencia registrada.");
      void qc.invalidateQueries({ queryKey: ["dispute", id] });
    },
  });

  if (query.isLoading) return <Screen title="Reclamo"><LoadingState /></Screen>;
  if (query.error) return <Screen title="Reclamo"><ErrorText message={userFacingError(query.error)} /></Screen>;
  const row = query.data;
  if (!row) return null;
  const messages = row.messages.filter((item) => !item.isInternalAdminNote);

  return (
    <Screen title={row.orderNumber}>
      <Text>
        {DISPUTE_REASON_LABELS[row.reason]} · {DISPUTE_STATUS_LABELS[row.status]}
      </Text>
      <Text style={{ color: colors.muted }}>
        Comprador {row.buyer.displayName} · vendedor {row.seller.displayName}
      </Text>
      {row.resolution ? <Text>Resolución: {row.resolution}</Text> : null}
      <Text style={{ fontWeight: "600", marginTop: 8 }}>Mensajes</Text>
      {messages.length === 0 ? <EmptyState>Sin mensajes aún.</EmptyState> : null}
      {messages.map((item) => (
        <Text key={item.id}>
          {item.author.displayName}: {item.body}
        </Text>
      ))}
      <Text style={{ fontWeight: "600" }}>Evidencia</Text>
      {row.evidence.length === 0 ? <EmptyState>Sin evidencia.</EmptyState> : null}
      {row.evidence.map((item) => (
        <Text key={item.id}>
          {item.evidenceType} · {item.mime} · {item.description || "sin descripción"}
        </Text>
      ))}
      <Field label="Mensaje" value={body} onChangeText={setBody} multiline />
      <Button label="Enviar mensaje" pending={send.isPending} disabled={body.trim().length < 1} onPress={() => send.mutate()} />
      <Button variant="secondary" label="Adjuntar evidencia (archivo diferido)" pending={evidence.isPending} onPress={() => evidence.mutate()} />
      <SuccessText message={notice} />
      <ErrorText message={send.error ? userFacingError(send.error) : evidence.error ? userFacingError(evidence.error) : null} />
    </Screen>
  );
}

export default function DisputeDetailScreen() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}
