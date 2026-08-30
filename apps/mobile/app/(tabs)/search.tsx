import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { isFilterVisible } from "@tcg/config";
import type { GameFilterView, GameFiltersView, GameView } from "@tcg/types";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { fetchGames, searchCards } from "../../src/lib/endpoints";
import { api } from "../../src/lib/api";
import { track } from "../../src/lib/analytics";
import { userFacingError } from "../../src/lib/errors";
import { EmptyState, ErrorText, Screen } from "../../src/ui/screen";
import { Field } from "../../src/ui/field";
import { ListRow } from "../../src/ui/list-row";
import { useColors } from "../../src/ui/theme-provider";

function useDebounce(value: string, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export default function SearchScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string; game?: string }>();
  const [q, setQ] = useState(params.q ?? "");
  const [game, setGame] = useState(params.game ?? "");
  const [attrs, setAttrs] = useState<Record<string, string>>({});
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const dq = useDebounce(q, 300);
  const games = useQuery({ queryKey: ["games"], queryFn: fetchGames });
  const filters = useQuery({
    queryKey: ["game-filters", game],
    queryFn: () => api<GameFiltersView>(`/v1/games/${game}/filters`),
    enabled: Boolean(game),
  });

  const selected = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(attrs)) {
      if (value) map[key] = [value];
    }
    return map;
  }, [attrs]);

  const visibleFilters = (filters.data?.filters ?? []).filter((filter) =>
    isFilterVisible(
      {
        key: filter.key,
        label: filter.label,
        group: filter.group,
        type: filter.type,
        source: { kind: "json", path: filter.key },
        order: filter.order,
        visibleWhen: filter.visibleWhen,
        tier: filter.tier,
      },
      selected,
    ),
  );
  const primaryFilters = visibleFilters.filter((filter) => (filter.tier ?? "PRIMARY") === "PRIMARY");
  const advancedFilters = visibleFilters.filter((filter) => filter.tier === "ADVANCED");
  const selectedCount = Object.values(attrs).filter(Boolean).length + (priceMin || priceMax ? 1 : 0) + (game ? 1 : 0);

  const queryString = useMemo(() => {
    const search = new URLSearchParams();
    if (dq.trim()) search.set("q", dq.trim());
    if (game) search.set("game", game);
    if (priceMin) search.set("priceMin", priceMin);
    if (priceMax) search.set("priceMax", priceMax);
    for (const [key, value] of Object.entries(attrs)) {
      if (!value) continue;
      if (["set", "rarity", "supertype", "language", "finish", "condition"].includes(key)) {
        search.set(key, value);
      } else if (key.endsWith("Min") || key.endsWith("Max")) {
        search.set(`attr.${key}`, value);
      } else {
        search.set(`attr.${key}`, value);
      }
    }
    search.set("pageSize", "20");
    return search;
  }, [dq, game, attrs, priceMin, priceMax]);

  const enabled = Boolean(dq.trim() || game || Object.values(attrs).some(Boolean) || priceMin || priceMax);

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
        <Text style={{ color: colors.muted, marginBottom: 8 }}>
          {showFilters ? "Ocultar filtros" : selectedCount ? `Filtros (${selectedCount})` : "Mostrar filtros"}
        </Text>
      </Pressable>
      {showFilters ? (
        <View style={{ gap: 8, marginBottom: 8 }}>
          <GamePicker games={games.data ?? []} value={game} onChange={(slug) => { setGame(slug); setAttrs({}); }} />
          {primaryFilters.map((filter) => (
            <MetadataField
              key={filter.key}
              filter={filter}
              attrs={attrs}
              onChange={(key, value) => setAttrs((current) => ({ ...current, [key]: value }))}
              priceMin={priceMin}
              priceMax={priceMax}
              onPriceMin={setPriceMin}
              onPriceMax={setPriceMax}
            />
          ))}
          {advancedFilters.length > 0 ? (
            <Pressable onPress={() => setShowAdvanced((value) => !value)} accessibilityRole="button" accessibilityLabel="Más filtros">
              <Text style={{ color: colors.muted }}>{showAdvanced ? "Ocultar más filtros" : "Más filtros"}</Text>
            </Pressable>
          ) : null}
          {showAdvanced
            ? advancedFilters.map((filter) => (
                <MetadataField
                  key={filter.key}
                  filter={filter}
                  attrs={attrs}
                  onChange={(key, value) => setAttrs((current) => ({ ...current, [key]: value }))}
                  priceMin={priceMin}
                  priceMax={priceMax}
                  onPriceMin={setPriceMin}
                  onPriceMax={setPriceMax}
                />
              ))
            : null}
          <Pressable
            onPress={() => {
              setAttrs({});
              setPriceMin("");
              setPriceMax("");
            }}
            accessibilityRole="button"
            accessibilityLabel="Limpiar todos"
          >
            <Text style={{ color: colors.muted }}>Limpiar todos</Text>
          </Pressable>
        </View>
      ) : null}
      {result.error ? <ErrorText message={userFacingError(result.error)} /> : null}
      {!enabled ? <EmptyState>Escribe un nombre o elige un juego.</EmptyState> : null}
      {enabled ? (
        <Text style={{ color: colors.muted, marginBottom: 8 }}>Ver {result.data?.pages[0]?.total ?? "…"} resultados</Text>
      ) : null}
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

function GamePicker({
  games,
  value,
  onChange,
}: {
  games: GameView[];
  value: string;
  onChange: (slug: string) => void;
}) {
  const colors = useColors();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: colors.text }}>Juego</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {games.map((row) => (
          <Pressable
            key={row.slug}
            onPress={() => onChange(row.slug === value ? "" : row.slug)}
            accessibilityRole="button"
            accessibilityLabel={row.name}
          >
            <Text style={{ color: row.slug === value ? colors.text : colors.muted }}>{row.name}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function MetadataField({
  filter,
  attrs,
  onChange,
  priceMin,
  priceMax,
  onPriceMin,
  onPriceMax,
}: {
  filter: GameFilterView;
  attrs: Record<string, string>;
  onChange: (key: string, value: string) => void;
  priceMin: string;
  priceMax: string;
  onPriceMin: (value: string) => void;
  onPriceMax: (value: string) => void;
}) {
  const value = attrs[filter.key] ?? "";
  if (filter.key === "price" || filter.type === "NUMBER_RANGE") {
    if (filter.key === "price") {
      return (
        <View style={{ gap: 8 }}>
          <Field label="Precio mín. CLP" value={priceMin} onChangeText={onPriceMin} keyboardType="numeric" />
          <Field label="Precio máx. CLP" value={priceMax} onChangeText={onPriceMax} keyboardType="numeric" />
        </View>
      );
    }
    return (
      <View style={{ gap: 8 }}>
        <Field
          label={`${filter.label} mín.`}
          value={attrs[`${filter.key}Min`] ?? ""}
          onChangeText={(next) => onChange(`${filter.key}Min`, next)}
          keyboardType="numeric"
        />
        <Field
          label={`${filter.label} máx.`}
          value={attrs[`${filter.key}Max`] ?? ""}
          onChangeText={(next) => onChange(`${filter.key}Max`, next)}
          keyboardType="numeric"
        />
      </View>
    );
  }
  if (filter.type === "BOOLEAN") {
    return (
      <Pressable onPress={() => onChange(filter.key, value === "true" ? "" : "true")} accessibilityRole="button">
        <Text>{filter.label}: {value === "true" ? "sí" : "no"}</Text>
      </Pressable>
    );
  }
  if (filter.options.length > 0) {
    return (
      <View style={{ gap: 6 }}>
        <Text>{filter.label}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {filter.options.map((option) => (
            <Pressable key={option.value} onPress={() => onChange(filter.key, value === option.value ? "" : option.value)}>
              <Text>{option.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  }
  if (filter.key === "q") return null;
  return <Field label={filter.label} value={value} onChangeText={(next) => onChange(filter.key, next)} />;
}
