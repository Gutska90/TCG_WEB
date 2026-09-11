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

/** Stored as `C-12`; UI and WhatsApp copy as `Consulta N° 12`. */
export function inquiryNumberLabel(inquiryNumber: string): string {
  return `Consulta N° ${inquiryNumber.replace(/^C-/, "")}`;
}

export function whatsappMeHref(e164: string, text: string): string {
  const number = e164.replace(/^\+/, "");
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

/** wa.me query strings get flaky past ~2k characters on some clients. */
export const WHATSAPP_MESSAGE_MAX_CHARS = 1800;

export type WhatsappCartLine = {
  cardName: string;
  setName: string;
  conditionLabel: string;
  quantity: number;
  lineTotalLabel: string;
};

function joinMessage(parts: Array<string | null | undefined>): string {
  return parts.filter((part): part is string => part != null).join("\n");
}

function clipWhatsappText(text: string): string {
  if (text.length <= WHATSAPP_MESSAGE_MAX_CHARS) return text;
  return `${text.slice(0, WHATSAPP_MESSAGE_MAX_CHARS - 1).trimEnd()}…`;
}

export function listingWhatsappMessage(input: {
  cardName: string;
  setName: string;
  condition: string;
  priceLabel: string;
  listingUrl?: string | null;
  quantity?: number;
  buyerName?: string | null;
  sellerName?: string | null;
}): string {
  const quantity = Math.max(1, input.quantity ?? 1);
  const greeting = input.sellerName ? `Hola ${input.sellerName},` : "Hola,";
  const intro = input.buyerName
    ? `Soy ${input.buyerName} y vi tu publicación en TCG Market Chile.`
    : "Vi tu publicación en TCG Market Chile.";
  const line =
    quantity > 1
      ? `• ${input.cardName} · ${input.setName} · ${input.condition} · x${quantity} — ${input.priceLabel}`
      : `• ${input.cardName} · ${input.setName} · ${input.condition} — ${input.priceLabel}`;
  return joinMessage([
    greeting,
    "",
    intro,
    "",
    line,
    "",
    "Esta consulta no reserva stock. Si sigue disponible, puedo pagarla en TCG Market Chile.",
    input.listingUrl || null,
    "",
    quantity > 1 ? "¿Están disponibles?" : "¿Sigue disponible?",
  ]);
}

export function cartSellerWhatsappMessage(input: {
  sellerName: string;
  buyerName: string | null;
  lines: WhatsappCartLine[];
  subtotalLabel: string;
  cartUrl?: string | null;
  inquiryNumber?: string | null;
}): string {
  const greeting = `Hola ${input.sellerName},`;
  const intro = input.buyerName
    ? `Soy ${input.buyerName} y vi tu inventario en TCG Market Chile. Me interesan:`
    : "Vi tu inventario en TCG Market Chile. Me interesan:";
  const footer = joinMessage([
    input.inquiryNumber ? inquiryNumberLabel(input.inquiryNumber) : null,
    `Subtotal publicado: ${input.subtotalLabel}`,
    "El envío o encuentro se confirma al pagar.",
    "",
    "Esta consulta no reserva stock. Si siguen disponibles, puedo pagar en TCG Market Chile.",
    input.cartUrl || null,
    "",
    "¿Están disponibles?",
  ]);

  const bullet = (line: WhatsappCartLine) =>
    `• ${line.cardName} · ${line.setName} · ${line.conditionLabel} · x${line.quantity} — ${line.lineTotalLabel}`;

  let visible = input.lines;
  let omitted = 0;
  const assemble = (lines: WhatsappCartLine[], extra: number) => {
    const bullets = lines.map(bullet);
    if (extra > 0) {
      bullets.push(`• … y ${extra} más en el carrito`);
    }
    return joinMessage([greeting, "", intro, "", ...bullets, "", footer]);
  };

  let text = assemble(visible, omitted);
  while (text.length > WHATSAPP_MESSAGE_MAX_CHARS && visible.length > 1) {
    visible = visible.slice(0, -1);
    omitted = input.lines.length - visible.length;
    text = assemble(visible, omitted);
  }
  return clipWhatsappText(text);
}

export function storeWhatsappMessage(input: { storeName: string; storeUrl: string; buyerName?: string | null }): string {
  const greeting = `Hola ${input.storeName},`;
  const intro = input.buyerName
    ? `Soy ${input.buyerName} y vi tu tienda en TCG Market Chile.`
    : "Vi tu tienda en TCG Market Chile.";
  return joinMessage([
    greeting,
    "",
    intro,
    "Si tienes lo que busco, armo el carrito y te consulto el lote desde ahí (el pago sigue en la plataforma).",
    "",
    input.storeUrl,
  ]);
}
