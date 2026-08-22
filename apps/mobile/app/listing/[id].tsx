import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CARD_CONDITION_LABELS, REPORT_REASON_LABELS, REPORT_REASONS, formatClp, formatReputation } from "@tcg/config";
import type { ReportReason } from "@tcg/config";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { track } from "../../src/lib/analytics";
import { api } from "../../src/lib/api";
import { fetchCart, fetchListing, putCartItem } from "../../src/lib/endpoints";
import { useAuth } from "../../src/lib/auth";
import { userFacingError } from "../../src/lib/errors";
import { Button, EmptyState, ErrorText, LoadingState, Screen, SuccessText } from "../../src/ui/screen";
import { Field } from "../../src/ui/field";
import { colors } from "../../src/ui/theme";
import { TextLink } from "../../src/ui/nav";

export default function ListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { me } = useAuth();
  const qc = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("COUNTERFEIT");
  const [description, setDescription] = useState("");
  const listing = useQuery({ queryKey: ["listing", id], queryFn: () => fetchListing(id), enabled: Boolean(id) });

  useEffect(() => {
    if (listing.data) track("listing_view");
  }, [listing.data]);

  const add = useMutation({
    mutationFn: async () => {
      const cart = await fetchCart();
      const current = cart.items.find((item) => item.listingId === id)?.quantity ?? 0;
      return putCartItem(id, current + 1);
    },
    onSuccess: () => {
      track("add_to_cart");
      setNotice("Agregada al carrito.");
      void qc.invalidateQueries({ queryKey: ["cart"] });
    },
  });
  const report = useMutation({
    mutationFn: () =>
      api("/v1/reports", {
        method: "POST",
        body: JSON.stringify({ targetType: "LISTING", targetId: id, reason, description: description || undefined }),
      }),
    onSuccess: () => setNotice("Reporte enviado. Lo revisará el equipo."),
  });

  if (listing.isLoading) return <Screen title="Publicación"><LoadingState /></Screen>;
  if (listing.error) return <Screen title="Publicación"><ErrorText message={userFacingError(listing.error)} /></Screen>;
  const row = listing.data;
  if (!row) return null;
  const unavailable = row.status !== "ACTIVE" || row.available <= 0;

  return (
    <Screen title={row.title}>
      <Text>
        {row.condition} · {CARD_CONDITION_LABELS[row.condition]} · {row.variant.language} · {row.variant.finish}
      </Text>
      <Text style={{ fontSize: 22, fontWeight: "600" }}>{formatClp(row.priceClp)}</Text>
      <Text>
        {unavailable ? "No disponible" : `${row.available} disponible(s)`} · stock {row.quantity}
      </Text>
      <Text>
        {row.allowsMeetup ? "Encuentro" : "Sin encuentro"} · {row.allowsShipping ? "Envío" : "Sin envío"}
      </Text>
      <Text>
        Vendedor {row.seller.displayName} · {formatReputation(row.seller.reputation.averageStars, row.seller.reputation.count)}
      </Text>
      {row.description ? <Text>{row.description}</Text> : null}
      {row.images.length > 0 ? (
        <Text style={{ color: colors.muted }}>{row.images.length} foto(s) registradas (el archivo público llega con object storage).</Text>
      ) : (
        <EmptyState>Sin fotos.</EmptyState>
      )}
      {unavailable ? <EmptyState>Esta publicación no se puede agregar al carrito.</EmptyState> : null}
      <Button
        label="Agregar al carrito"
        disabled={!me || unavailable}
        pending={add.isPending}
        onPress={() => add.mutate()}
      />
      {!me ? <TextLink href="/login" label="Ingresa para comprar" /> : null}
      <Button variant="secondary" label="Reportar" onPress={() => setReportOpen(true)} />
      {reportOpen ? (
        <View style={{ gap: 8 }}>
          {REPORT_REASONS.map((value) => (
            <Button
              key={value}
              variant={reason === value ? "primary" : "secondary"}
              label={REPORT_REASON_LABELS[value]}
              onPress={() => setReason(value)}
            />
          ))}
          <Field label="Detalle (opcional)" value={description} onChangeText={setDescription} multiline />
          <Button label="Enviar reporte" pending={report.isPending} onPress={() => report.mutate()} />
        </View>
      ) : null}
      <SuccessText message={notice} />
      <ErrorText message={add.error ? userFacingError(add.error) : report.error ? userFacingError(report.error) : null} />
      <Button variant="secondary" label="Ver carta" onPress={() => router.push(`/card/${row.variant.card.id}`)} />
    </Screen>
  );
}
