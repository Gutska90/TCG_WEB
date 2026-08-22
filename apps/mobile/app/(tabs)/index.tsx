import { useQuery } from "@tanstack/react-query";
import { LEGAL } from "@tcg/config";
import { formatClp } from "@tcg/config";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { fetchGames, fetchListings } from "../../src/lib/endpoints";
import { useAuth } from "../../src/lib/auth";
import { userFacingError } from "../../src/lib/errors";
import { Button, EmptyState, ErrorText, LoadingState, Screen } from "../../src/ui/screen";
import { ListRow } from "../../src/ui/list-row";
import { TextLink } from "../../src/ui/nav";
import { colors, space } from "../../src/ui/theme";

export default function HomeScreen() {
  const router = useRouter();
  const { me } = useAuth();
  const [q, setQ] = useState("");
  const games = useQuery({ queryKey: ["games"], queryFn: fetchGames });
  const listings = useQuery({
    queryKey: ["listings", "home"],
    queryFn: () => fetchListings(new URLSearchParams({ pageSize: "8" })),
  });

  return (
    <Screen title="TCG Platform">
      <Text style={{ color: colors.muted, fontSize: 13 }}>Beta · {LEGAL.betaProductNotice}</Text>
      <TextInput
        accessibilityLabel="Buscar cartas"
        placeholder="Buscar cartas"
        placeholderTextColor={colors.muted}
        value={q}
        onChangeText={setQ}
        returnKeyType="search"
        onSubmitEditing={() => router.push(`/search?q=${encodeURIComponent(q)}`)}
        style={{
          minHeight: 44,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 8,
          paddingHorizontal: 12,
          fontSize: 16,
        }}
      />
      <Button label="Buscar" onPress={() => router.push(`/search?q=${encodeURIComponent(q)}`)} />

      <Text style={{ fontWeight: "600", fontSize: 16, marginTop: space.sm }}>Juegos</Text>
      {games.isLoading ? <LoadingState /> : null}
      {games.error ? <ErrorText message={userFacingError(games.error)} /> : null}
      {games.data?.map((game) => (
        <Pressable
          key={game.id}
          accessibilityRole="button"
          accessibilityLabel={game.name}
          onPress={() => router.push(`/search?game=${game.slug}`)}
          style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: colors.border }}
        >
          <Text style={{ fontSize: 16 }}>{game.name}</Text>
          <Text style={{ color: colors.muted, fontSize: 13 }}>{game.publisher}</Text>
        </Pressable>
      ))}
      {games.data?.length === 0 ? <EmptyState>Aún no hay juegos. Corre el seed de catálogo.</EmptyState> : null}

      <Text style={{ fontWeight: "600", fontSize: 16, marginTop: space.md }}>Publicaciones recientes</Text>
      {listings.isLoading ? <LoadingState /> : null}
      {listings.error ? <ErrorText message={userFacingError(listings.error)} /> : null}
      {listings.data?.items.map((item) => (
        <ListRow
          key={item.id}
          title={item.title}
          subtitle={`${item.seller.displayName} · ${item.condition}`}
          right={formatClp(item.priceClp)}
          onPress={() => router.push(`/listing/${item.id}`)}
        />
      ))}
      {listings.data?.items.length === 0 ? <EmptyState>No hay publicaciones activas.</EmptyState> : null}

      <View style={{ gap: 8, marginTop: space.md }}>
        <TextLink href="/purchases" label="Mis compras" />
        {me?.roles.includes("SELLER") ? <TextLink href="/sales" label="Mis ventas" /> : null}
        {me?.roles.includes("SELLER") ? <TextLink href="/sell" label="Mis publicaciones" /> : null}
      </View>
    </Screen>
  );
}
