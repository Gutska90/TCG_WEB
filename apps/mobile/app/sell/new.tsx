import { useMutation, useQuery } from "@tanstack/react-query";
import { CARD_CONDITIONS, LEGAL } from "@tcg/config";
import type { CardCondition } from "@tcg/config";
import { createListingSchema } from "@tcg/validation";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text } from "react-native";
import type { ListingView, SearchCardView } from "@tcg/types";
import { track } from "../../src/lib/analytics";
import { api } from "../../src/lib/api";
import { fetchCard, searchCards } from "../../src/lib/endpoints";
import { pickAndUploadImage } from "../../src/lib/files";
import { userFacingError } from "../../src/lib/errors";
import { Button, ErrorText, Screen, SuccessText } from "../../src/ui/screen";
import { Field } from "../../src/ui/field";
import { RequireAuth } from "../../src/ui/nav";
import { useColors } from "../../src/ui/theme-provider";

function Inner() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{
    variantId?: string;
    condition?: string;
    quantity?: string;
    collectionItemId?: string;
  }>();
  const [q, setQ] = useState("");
  const [cardId, setCardId] = useState<string | null>(null);
  const [variantId, setVariantId] = useState(params.variantId ?? "");
  const [condition, setCondition] = useState<CardCondition>(
    CARD_CONDITIONS.includes(params.condition as CardCondition) ? (params.condition as CardCondition) : "NM",
  );
  const [quantity, setQuantity] = useState(params.quantity ?? "1");
  const [priceClp, setPriceClp] = useState("1000");
  const [meetup, setMeetup] = useState(true);
  const [shipping, setShipping] = useState(true);
  const [description, setDescription] = useState("");
  const hits = useQuery({
    queryKey: ["sell-search", q],
    enabled: q.trim().length >= 2,
    queryFn: () => searchCards(new URLSearchParams({ q: q.trim(), pageSize: "8" })),
  });
  const card = useQuery({
    queryKey: ["card", cardId],
    queryFn: () => fetchCard(cardId!),
    enabled: Boolean(cardId),
  });
  const create = useMutation({
    mutationFn: async () => {
      const fileId = await pickAndUploadImage("LISTING");
      const parsed = createListingSchema.safeParse({
        variantId,
        condition,
        quantity: Number(quantity),
        priceClp: Number(priceClp),
        imageFileIds: [fileId],
        allowsMeetup: meetup,
        allowsShipping: shipping,
        description: description || undefined,
        sourceCollectionItemId: params.collectionItemId || undefined,
      });
      if (!parsed.success) throw new Error("invalid");
      return api<ListingView>("/v1/listings", { method: "POST", body: JSON.stringify(parsed.data) });
    },
    onSuccess: (row) => {
      track("seller_listing_created");
      router.replace(`/sell/${row.id}`);
    },
  });

  return (
    <Screen title="Nueva publicación">
      <Field label="Buscar carta" value={q} onChangeText={setQ} />
      {(hits.data?.items ?? []).map((item: SearchCardView) => (
        <Pressable key={item.id} onPress={() => setCardId(item.id)} accessibilityRole="button" accessibilityLabel={item.name}>
          <Text style={{ paddingVertical: 8, fontWeight: cardId === item.id ? "700" : "400" }}>
            {item.name} · {item.setName}
          </Text>
        </Pressable>
      ))}
      {card.data?.variants.map((variant) => (
        <Button
          key={variant.id}
          variant={variantId === variant.id ? "primary" : "secondary"}
          label={`${variant.language} · ${variant.finish}`}
          onPress={() => setVariantId(variant.id)}
        />
      ))}
      {CARD_CONDITIONS.map((value) => (
        <Button key={value} variant={condition === value ? "primary" : "secondary"} label={value} onPress={() => setCondition(value)} />
      ))}
      <Field label="Cantidad" value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
      <Field label="Precio CLP" value={priceClp} onChangeText={setPriceClp} keyboardType="numeric" />
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: meetup }} onPress={() => setMeetup((v) => !v)}>
        <Text>{meetup ? "☑" : "☐"} Encuentro</Text>
      </Pressable>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: shipping }} onPress={() => setShipping((v) => !v)}>
        <Text>{shipping ? "☑" : "☐"} Envío</Text>
      </Pressable>
      <Field label="Descripción" value={description} onChangeText={setDescription} multiline />
      <Text style={{ color: colors.muted, fontSize: 13 }}>
        Al publicar se pide una foto (JPEG, PNG o WebP). {LEGAL.betaNotice}
      </Text>
      <ErrorText
        message={
          create.error
            ? create.error instanceof Error && create.error.message === "invalid"
              ? "Revisa cantidad, precio y variante."
              : create.error instanceof Error && create.error.message === "cancel"
                ? "Elige una foto para publicar."
                : userFacingError(create.error)
            : null
        }
      />
      <Button label="Publicar" pending={create.isPending} disabled={!variantId} onPress={() => create.mutate()} />
      <SuccessText message={null} />
    </Screen>
  );
}

export default function SellNewScreen() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}
