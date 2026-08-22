import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatClp } from "@tcg/config";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { api } from "../../src/lib/api";
import { fetchMyListings } from "../../src/lib/endpoints";
import { useAuth } from "../../src/lib/auth";
import { userFacingError } from "../../src/lib/errors";
import { Button, EmptyState, ErrorText, LoadingState, Screen, SuccessText } from "../../src/ui/screen";
import { ListRow } from "../../src/ui/list-row";
import { RequireAuth, TextLink } from "../../src/ui/nav";
import { useState } from "react";

function Inner() {
  const router = useRouter();
  const { me } = useAuth();
  const qc = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["my-listings"],
    queryFn: fetchMyListings,
    enabled: Boolean(me?.roles.includes("SELLER")),
  });
  const pause = useMutation({
    mutationFn: (id: string) => api(`/v1/listings/${id}/pause`, { method: "POST" }),
    onSuccess: () => {
      setNotice("Publicación pausada.");
      void qc.invalidateQueries({ queryKey: ["my-listings"] });
    },
  });
  const activate = useMutation({
    mutationFn: (id: string) => api(`/v1/listings/${id}/activate`, { method: "POST" }),
    onSuccess: () => {
      setNotice("Publicación reactivada.");
      void qc.invalidateQueries({ queryKey: ["my-listings"] });
    },
  });

  if (!me?.roles.includes("SELLER")) {
    return (
      <Screen title="Publicaciones">
        <EmptyState>Activa la cuenta vendedor para publicar.</EmptyState>
        <TextLink href="/seller-onboarding" label="Onboarding vendedor" />
      </Screen>
    );
  }
  if (query.isLoading) return <Screen title="Publicaciones"><LoadingState /></Screen>;
  if (query.error) return <Screen title="Publicaciones"><ErrorText message={userFacingError(query.error)} /></Screen>;

  return (
    <Screen title="Mis publicaciones">
      <Button label="Nueva publicación" onPress={() => router.push("/sell/new")} />
      {query.data?.items.length === 0 ? <EmptyState>Aún no publicas.</EmptyState> : null}
      {query.data?.items.map((item) => (
        <View key={item.id} style={{ marginBottom: 8 }}>
          <ListRow
            title={item.title}
            subtitle={`${item.status} · ${item.available} disp.`}
            right={formatClp(item.priceClp)}
            onPress={() => router.push(`/sell/${item.id}`)}
          />
          {item.status === "ACTIVE" ? (
            <Button variant="secondary" label="Pausar" onPress={() => pause.mutate(item.id)} />
          ) : (
            <Button variant="secondary" label="Reactivar" onPress={() => activate.mutate(item.id)} />
          )}
        </View>
      ))}
      <SuccessText message={notice} />
      <ErrorText message={pause.error ? userFacingError(pause.error) : activate.error ? userFacingError(activate.error) : null} />
    </Screen>
  );
}

export default function SellIndexScreen() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}
