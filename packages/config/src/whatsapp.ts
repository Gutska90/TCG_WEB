/** Normalize a public WhatsApp number to E.164. Chilean 9xxxxxxxx is assumed +56. */
export function normalizeWhatsappE164(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const compact = trimmed.replace(/[^\d+]/g, "");
  let digits = compact.startsWith("+") ? compact.slice(1) : compact;
  digits = digits.replace(/\D/g, "");
  if (/^9\d{8}$/.test(digits)) {
    digits = `56${digits}`;
  }
  if (digits.length < 8 || digits.length > 15 || !/^[1-9]\d{7,14}$/.test(digits)) {
    return null;
  }
  return `+${digits}`;
}

export function whatsappMeHref(e164: string, text: string): string {
  const number = e164.replace(/^\+/, "");
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

export function listingWhatsappMessage(input: {
  cardName: string;
  setName: string;
  condition: string;
  priceLabel: string;
  listingUrl: string;
}): string {
  return [
    "Hola, vi tu publicación en TCG Market Chile.",
    "",
    `Carta: ${input.cardName}`,
    `Edición: ${input.setName}`,
    `Condición: ${input.condition}`,
    `Precio publicado: ${input.priceLabel}`,
    "",
    "¿Sigue disponible?",
    "",
    input.listingUrl,
  ].join("\n");
}
