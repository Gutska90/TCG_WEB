import { useInfiniteQuery } from "@tanstack/react-query";
import { CARD_FINISHES, CARD_LANGUAGES } from "@tcg/config";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { searchCards } from "../../src/lib/endpoints";
import { track } from "../../src/lib/analytics";
import { userFacingError } from "../../src/lib/errors";
import { EmptyState, ErrorText, Screen } from "../../src/ui/screen";
import { Field } from "../../src/ui/field";
import { ListRow } from "../../src/ui/list-row";
import { colors } from "../../src/ui/theme";

function useDebounce(value: string, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string; game?: string }>();
  const [q, setQ] = useState(params.q ?? "");
  const [game, setGame] = useState(params.game ?? "");
  const [set, setSet] = useState("");
  const [language, setLanguage] = useState("");
  const [finish, setFinish] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const dq = useDebounce(q, 300);

  const queryString = useMemo(() => {
    const search = new URLSearchParams();
    if (dq.trim()) search.set("q", dq.trim());
    if (game) search.set("game", game);
    if (set) search.set("set", set);
    if (language) search.set("language", language);
    if (finish) search.set("finish", finish);
    if (priceMin) search.set("priceMin", priceMin);
    if (priceMax) search.set("priceMax", priceMax);
    search.set("pageSize", "20");
    return search;
  }, [dq, game, set, language, finish, priceMin, priceMax]);

  const enabled = Boolean(dq.trim() || game || set || language || finish || priceMin || priceMax);

  const result = useInfiniteQuery({
    queryKey: ["search", queryString.toString()],
    enabled,
    initialPageParam: 1,
    queryFn: ({ pageParam }) => {
      const next = new URLSearchParams(queryString);
      next.set("page", String(pageParam));
      return searchCards(next);
    },
    getNextPageParam: (last) => {
      const loaded = last.page * last.pageSize;
      return loaded < last.total ? last.page + 1 : undefined;
    },
  });

  useEffect(() => {
    if (dq.trim()) track("search", { qLength: dq.trim().length });
  }, [dq]);

  const items = result.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <Screen scroll={false} title="Buscar">
      <Field label="Nombre o número" value={q} onChangeText={setQ} placeholder="Test Mon" autoCapitalize="none" />
      <Pressable onPress={() => setShowFilters((v) => !v)} accessibilityRole="button" accessibilityLabel="Filtros">
        <Text style={{ color: colors.muted, marginBottom: 8 }}>{showFilters ? "Ocultar filtros" : "Mostrar filtros"}</Text>
      </Pressable>
      {showFilters ? (
        <View style={{ gap: 8 }}>
          <Field label="Juego (slug)" value={game} onChangeText={setGame} placeholder="pokemon" />
          <Field label="Set" value={set} onChangeText={setSet} />
          <Field label="Idioma" value={language} onChangeText={setLanguage} placeholder={CARD_LANGUAGES.join(" / ")} />
          <Field label="Finish" value={finish} onChangeText={setFinish} placeholder={CARD_FINISHES[0]} />
          <Field label="Precio mín. CLP" value={priceMin} onChangeText={setPriceMin} keyboardType="numeric" />
          <Field label="Precio máx. CLP" value={priceMax} onChangeText={setPriceMax} keyboardType="numeric" />
        </View>
      ) : null}
      {result.error ? <ErrorText message={userFacingError(result.error)} /> : null}
      {!enabled ? <EmptyState>Escribe un nombre o elige un juego.</EmptyState> : null}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ListRow
            title={item.name}
            subtitle={`${item.gameName} · ${item.setName} · ${item.number}`}
            imageUrl={item.imageUrl}
            onPress={() => router.push(`/card/${item.id}`)}
          />
        )}
        onEndReached={() => {
          if (result.hasNextPage && !result.isFetchingNextPage) void result.fetchNextPage();
        }}
        ListEmptyComponent={
          enabled && !result.isLoading ? (
            <EmptyState>No hay cartas que coincidan. Puedes enviar feedback desde Perfil.</EmptyState>
          ) : null
        }
        ListFooterComponent={result.isFetchingNextPage ? <ActivityIndicator color={colors.text} /> : null}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </Screen>
  );
}
