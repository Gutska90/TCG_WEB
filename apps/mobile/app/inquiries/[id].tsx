import { useQuery } from "@tanstack/react-query";
import {
  CARD_CONDITION_LABELS,
  SELLER_INQUIRY_STATUS_LABELS,
  formatClp,
  inquiryNumberLabel,
  whatsappMeHref,
} from "@tcg/config";
import { useLocalSearchParams } from "expo-router";
import { Text } from "react-native";
import { getInquiry } from "../../src/lib/endpoints";
import { userFacingError } from "../../src/lib/errors";
import { openWhatsappHref } from "../../src/lib/whatsapp";
import { Button, ErrorText, LoadingState, Screen } from "../../src/ui/screen";
import { RequireAuth } from "../../src/ui/nav";

function Inner() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useQuery({ queryKey: ["inquiry", id], queryFn: () => getInquiry(id), enabled: Boolean(id) });

  if (query.isLoading) return <Screen title="Consulta"><LoadingState /></Screen>;
  if (query.error) return <Screen title="Consulta"><ErrorText message={userFacingError(query.error)} /></Screen>;
  const row = query.data;
  if (!row) return null;

  const phone = row.seller.contactWhatsapp;

  return (
    <Screen title={inquiryNumberLabel(row.inquiryNumber)}>
      <Text>
        {row.seller.displayName} · {SELLER_INQUIRY_STATUS_LABELS[row.status]} · {formatClp(row.subtotalClp)}
      </Text>
      <Text>Vence {new Date(row.expiresAt).toLocaleString("es-CL")}. No reserva stock.</Text>
      {row.items.map((item) => (
        <Text key={item.listingId}>
          {item.titleSnapshot} · {CARD_CONDITION_LABELS[item.condition]} · x{item.quantity}
        </Text>
      ))}
      {phone ? (
        <Button
          variant="secondary"
          label="Abrir WhatsApp"
          onPress={() => void openWhatsappHref(whatsappMeHref(phone, row.messageText))}
        />
      ) : null}
    </Screen>
  );
}

export default function InquiryDetailScreen() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}
