export const LEGAL = {
  termsVersion: "2026-08-21.beta.1",
  privacyVersion: "2026-08-21.beta.1",
  betaNotice: "Documento de beta / sujeto a revisión legal antes de producción real.",
  betaProductNotice: "Esta versión está en prueba. Algunas funciones pueden cambiar.",
  get contactEmail(): string {
    return process.env.LEGAL_CONTACT_EMAIL?.trim() || "soporte@localhost";
  },
  get privacyEmail(): string {
    return process.env.LEGAL_PRIVACY_EMAIL?.trim() || "privacidad@localhost";
  },
};

export const PUBLIC_LEGAL_LINKS = [
  { href: "/terminos", label: "Términos" },
  { href: "/privacidad", label: "Privacidad" },
  { href: "/marketplace", label: "Reglas del marketplace" },
  { href: "/refunds", label: "Reembolsos y cancelaciones" },
  { href: "/ayuda", label: "Ayuda" },
] as const;

export const LEGAL_CONSENT_CHECKBOX = {
  name: "acceptTerms",
  label: "He leído y acepto Términos y Política de Privacidad.",
  defaultChecked: false,
} as const;

export const MARKETING_CONSENT_CHECKBOX = {
  name: "marketingOptIn",
  label: "Quiero recibir novedades opcionales (no es obligatorio).",
  defaultChecked: false,
} as const;

export const COMPRA_PROTEGIDA_DEFINITION =
  "Conjunto de reglas internas de TCG Platform para soporte, moderación y resolución de disputas.";

export const PAYMENT_COPY = {
  held: "Pago recibido por la plataforma; aún no elegible para liquidación al vendedor.",
  released: "Orden elegible para liquidación al vendedor.",
  payout: "Liquidación registrada/pagada al vendedor.",
} as const;

export const FORBIDDEN_PAYMENT_USER_PHRASES = [
  "mercado pago retiene",
  "escrow mercado pago",
  "dinero protegido por mercado pago",
] as const;

export type LegalSection = {
  heading: string;
  paragraphs: string[];
};

export type LegalDocument = {
  slug: string;
  title: string;
  version: string;
  sections: LegalSection[];
};

export function legalAcceptanceIsCurrent(input: {
  termsVersion: string | null | undefined;
  privacyVersion: string | null | undefined;
}): boolean {
  return input.termsVersion === LEGAL.termsVersion && input.privacyVersion === LEGAL.privacyVersion;
}

export function containsForbiddenPaymentCopy(text: string): boolean {
  const normalized = text.toLocaleLowerCase("es-CL");
  return FORBIDDEN_PAYMENT_USER_PHRASES.some((phrase) => normalized.includes(phrase));
}

export const TERMS_DOCUMENT: LegalDocument = {
  slug: "terminos",
  title: "Términos y condiciones (beta)",
  version: LEGAL.termsVersion,
  sections: [
    {
      heading: "Aviso de beta",
      paragraphs: [
        LEGAL.betaNotice,
        "Estos términos describen cómo funciona TCG Platform durante una beta cerrada. No son un contrato validado por abogado y pueden cambiar. La beta no habilita dinero real: los cobros live de Mercado Pago permanecen bloqueados.",
      ],
    },
    {
      heading: "Elegibilidad de usuarios",
      paragraphs: [
        "La beta está dirigida a personas en Chile con capacidad para contratar. Debes usar un email propio y datos razonablemente exactos. La plataforma puede limitar el acceso a cuentas invitadas o al personal interno.",
        "No está pensada para menores de 18 años sin supervisión de un adulto responsable. Si detectamos uso incompatible con esta beta, podemos desactivar la cuenta.",
      ],
    },
    {
      heading: "Cuenta y seguridad",
      paragraphs: [
        "Eres responsable de la confidencialidad de tu cuenta, sesiones y dispositivos. Avísanos si sospechas un acceso no autorizado.",
        "Podemos pedir verificación de email antes de vender o pagar. No compartas tokens, códigos de recuperación ni capturas con secretos.",
      ],
    },
    {
      heading: "Conducta prohibida",
      paragraphs: [
        "No está permitido el fraude, las falsificaciones, el abuso de reportes o disputas, el acoso, la evasión de comisiones si aplican, ni el uso de la plataforma para actividades ilícitas.",
        "Tampoco está permitido manipular evidencia, suplantar a otras personas o interferir con sistemas, logs o pagos.",
      ],
    },
    {
      heading: "Rol de TCG Platform",
      paragraphs: [
        "TCG Platform opera un marketplace digital: pone en contacto a compradores y vendedores, aplica reglas internas y, cuando hay cobro, usa un procesador de pagos.",
        "TCG Platform no es el vendedor de las cartas publicadas por usuarios, no certifica autenticidad absoluta y no actúa como aseguradora.",
        "No afirmamos que exista un escrow contractual de Mercado Pago ni que Mercado Pago retenga fondos a nombre del comprador. El cobro, si ocurre, entra a la cuenta de la plataforma según el modelo interno documentado; la liquidación al vendedor es un paso posterior.",
      ],
    },
    {
      heading: "Publicaciones y listings",
      paragraphs: [
        "Quien publica debe describir el artículo de forma razonable: juego, variante, condición, precio y fotos cuando se exijan. El listing debe corresponder al producto real y al stock disponible.",
        "La plataforma puede pausar, ocultar o rechazar publicaciones que incumplan estas reglas o las de moderación.",
      ],
    },
    {
      heading: "Responsabilidad del vendedor sobre condición y autenticidad",
      paragraphs: [
        "El vendedor es responsable de la condición, autenticidad y correspondencia de lo publicado. TCG Platform no garantiza autenticidad absoluta ni emite certificados.",
        "Un error de descripción puede dar lugar a disputa, reembolso o moderación, según el caso. Eso no convierte a la plataforma en perito ni en aseguradora.",
      ],
    },
    {
      heading: "Órdenes",
      paragraphs: [
        "Una compra puede generar una orden por vendedor. El estado de la orden (pago, preparación, envío, entrega, confirmación) es interno de la plataforma.",
        "Pagar no transfiere de inmediato un derecho de liquidación al vendedor. Ver la página de reembolsos y las reglas del marketplace.",
      ],
    },
    {
      heading: "Cancelaciones",
      paragraphs: [
        "Una orden puede cancelarse en ciertos estados, por ejemplo si el pago no se completó a tiempo. El vendedor o la plataforma también pueden cancelar cuando las reglas lo permitan.",
        "Los plazos concretos pueden variar. No prometemos un SLA financiero fijo en esta beta.",
      ],
    },
    {
      heading: "Disputas",
      paragraphs: [
        "Comprador o vendedor pueden abrir un reclamo cuando hay un problema con la mercancía o la entrega, en los estados de orden que la plataforma permite.",
        "Una disputa es un caso interno de soporte y moderación. No mueve dinero por sí sola. Refunds y liquidaciones siguen los flujos de operación.",
      ],
    },
    {
      heading: "Moderación y suspensión",
      paragraphs: [
        "Podemos pausar listings, suspender la facultad de vender o desactivar cuentas ante abuso, fraude, incumplimiento o riesgo operativo.",
        "Suspender a un vendedor no cancela automáticamente órdenes ya pagadas ni borra registros financieros.",
      ],
    },
    {
      heading: "Propiedad intelectual",
      paragraphs: [
        "El catálogo de cartas se basa en fuentes públicas o licenciables; no copiamos catálogos de otros marketplaces. Los nombres y marcas de juegos pertenecen a sus titulares.",
        "No publiques imágenes robadas, listings que infrinjan derechos de terceros ni contenido que no te corresponde usar.",
      ],
    },
    {
      heading: "Limitaciones de la beta",
      paragraphs: [
        "La beta puede tener errores, cambios de funciones, interrupciones y copy provisional. Algunas pantallas futuras (app móvil, colecciones, precios históricos, wishlist, scanner, tiendas, subastas) no forman parte de este alcance.",
        "Los pagos reales están deshabilitados hasta revisión legal, contractual y comercial. Un entorno de pruebas no autoriza cobros live.",
      ],
    },
    {
      heading: "Disponibilidad del servicio",
      paragraphs: [
        "El servicio se ofrece “tal cual” durante la beta. Podemos aplicar mantenciones, kill switches o límites temporales de checkout, listings, refunds o liquidaciones.",
        "No prometemos disponibilidad continua ni indemnización por interrupciones en esta fase.",
      ],
    },
    {
      heading: "Terminación de cuenta",
      paragraphs: [
        "Puedes solicitar la desactivación de tu cuenta desde el perfil. Eso no elimina órdenes, pagos, reembolsos, asientos de ledger ni registros de auditoría, que se conservan según la política de la plataforma.",
        "TCG Platform puede desactivar cuentas que incumplan estos términos o que dejen de ser adecuadas para la beta.",
      ],
    },
    {
      heading: "Contacto",
      paragraphs: [
        `Para soporte: ${LEGAL.contactEmail} o la página de ayuda. Para privacidad: ${LEGAL.privacyEmail}.`,
        "Los correos de esta beta son de operación interna; sustituirlos por direcciones reales es un paso de salida a producción.",
      ],
    },
  ],
};

export const PRIVACY_DOCUMENT: LegalDocument = {
  slug: "privacidad",
  title: "Política de privacidad (beta)",
  version: LEGAL.privacyVersion,
  sections: [
    {
      heading: "Aviso de beta",
      paragraphs: [
        LEGAL.betaNotice,
        "Esta política describe datos que el código de TCG Platform puede manejar hoy. No prometemos plazos de retención específicos si no están implementados. No afirmamos recoger datos que el producto no usa.",
      ],
    },
    {
      heading: "Datos que puede manejar la plataforma",
      paragraphs: [
        "Cuenta: email, displayName, slug, avatar si se sube, verificación de email, hash de contraseña si usas email+password (nunca la contraseña en claro).",
        "Perfil: bio, región, comuna, país, fecha de onboarding de vendedor.",
        "Direcciones: destinatario, teléfono cuando corresponda, calle, comuna, región, código postal, etiquetas de envío.",
        "Marketplace: listings, fotos de publicación, carrito, checkouts, órdenes, envíos, valoraciones públicas o privadas según el flujo.",
        "Pagos: metadatos de pago (estado interno, montos en CLP, identificadores de proveedor, timestamps). No almacenamos el número completo de tarjeta.",
        "Trust: disputas, mensajes, evidencia declarada, reportes, acciones de moderación, suspensiones de vendedor.",
        "Técnicos: logs de aplicación, request id, user-agent e IP de sesión, métricas operacionales, jobs internos.",
        "Beta: feedback (categoría, mensaje, pantalla, versión de app, request id) y consentimiento legal (versión de términos/privacidad y fecha).",
        "En esta web no hay app nativa; si más adelante hay app, podría añadirse metadata de dispositivo. Hoy, en web, eso se limita a user-agent y datos de sesión.",
      ],
    },
    {
      heading: "Finalidades",
      paragraphs: [
        "Autenticación y seguridad de la cuenta; operar el marketplace (publicar, comprar, enviar); coordinar envíos o encuentros; soporte; prevención de fraude y moderación; analítica operacional (errores, jobs, salud del sistema); recoger feedback de la beta.",
        "El opt-in de marketing es independiente. Si no lo marcas, no lo usamos como base para enviar novedades comerciales.",
      ],
    },
    {
      heading: "Acceso, corrección y eliminación",
      paragraphs: [
        "Puedes ver datos básicos de cuenta en tu perfil y actualizar nombre y perfil. Las direcciones se gestionan en tu cuenta.",
        "Puedes solicitar desactivación o eliminación de cuenta. Si hay órdenes, pagos o auditoría, no hacemos un borrado duro de registros financieros: se conserva lo necesario para la operación y la política de la plataforma, y la cuenta queda desactivada.",
        "No borramos Order, Payment, Refund, Ledger ni AuditLog por una solicitud de baja.",
      ],
    },
    {
      heading: "Cookies y almacenamiento local",
      paragraphs: [
        "Usamos una cookie httpOnly de sesión de refresco (`Refresh`) para mantener el inicio de sesión. Es estrictamente funcional.",
        "El access token se guarda en sessionStorage (`tcg.accessToken` en web; `tcg.admin.accessToken` en admin). No usamos localStorage para autenticación.",
        "No hay cookies de analítica ni de marketing en esta beta. Por eso no mostramos un banner de cookies no esenciales. Si se agregan analíticas no esenciales, se pedirá un consentimiento separado.",
      ],
    },
    {
      heading: "Proveedores externos",
      paragraphs: [
        "Autenticación opcional con Google o Apple (si está configurada): recibimos identificador, email y, si aplica, nombre.",
        "Pagos: Mercado Pago actúa como procesador cuando hay cobro. Recibe lo necesario para el checkout; nosotros guardamos metadatos de pago, no el PAN de la tarjeta.",
        "Correo transaccional: Resend, si hay API key; si no, el mensaje queda en logs de desarrollo.",
        "Archivos: almacenamiento de objetos cuando está configurado (p. ej. R2) para fotos. La evidencia de disputas en esta fase puede estar diferida y no publicarse en un bucket abierto.",
      ],
    },
    {
      heading: "Transferencias de datos",
      paragraphs: [
        "Algunos proveedores pueden procesar datos fuera de Chile. En la beta no hay un mecanismo adicional de cláusulas contractuales implementado en producto; esto debe revisarse legalmente antes de producción real.",
      ],
    },
    {
      heading: "Cambios de política",
      paragraphs: [
        `La versión vigente es ${LEGAL.privacyVersion}. Si cambia, quedará registrada la versión que aceptaste. El sistema puede detectar una aceptación anterior. En esta beta no forzamos un nuevo consentimiento automático.`,
      ],
    },
    {
      heading: "Contacto de privacidad",
      paragraphs: [`Escríbenos a ${LEGAL.privacyEmail}. ${LEGAL.betaNotice}`],
    },
  ],
};

export const MARKETPLACE_DOCUMENT: LegalDocument = {
  slug: "marketplace",
  title: "Reglas del marketplace (beta)",
  version: LEGAL.termsVersion,
  sections: [
    {
      heading: "Aviso de beta",
      paragraphs: [LEGAL.betaNotice],
    },
    {
      heading: "Compra Protegida",
      paragraphs: [
        `Si ves o usamos el concepto “Compra Protegida”, significa solo esto: ${COMPRA_PROTEGIDA_DEFINITION}`,
        "No es un seguro, no es un escrow contractual, no es una garantía financiera y no es una certificación de autenticidad.",
      ],
    },
    {
      heading: "Reglas para vendedores",
      paragraphs: [
        "El listing debe corresponder al producto real. La condición debe ser razonablemente exacta. Las fotos deben corresponder al artículo cuando se exijan.",
        "Están prohibidas las falsificaciones, las imágenes robadas, publicar sin stock real, manipular precios de forma abusiva y evadir comisiones si aplican.",
        "El vendedor debe despachar o coordinar la entrega según el método elegido y responder a las disputas. El abuso puede terminar en pausa de listings o suspensión.",
      ],
    },
    {
      heading: "Reglas para compradores",
      paragraphs: [
        "Usa datos correctos de contacto y envío. No abuses de chargebacks ni manipules evidencia. Mantén una conducta respetuosa en mensajes y reclamos.",
      ],
    },
    {
      heading: "Pagos y liquidación (copy de producto)",
      paragraphs: [
        PAYMENT_COPY.held,
        PAYMENT_COPY.released,
        PAYMENT_COPY.payout,
        "Mercado Pago, cuando corresponde, es el procesador. No atribuimos al procesador una retención a nombre del comprador, ni un escrow, ni una protección financiera de los fondos.",
      ],
    },
  ],
};

export const REFUNDS_DOCUMENT: LegalDocument = {
  slug: "refunds",
  title: "Reembolsos y cancelaciones (beta)",
  version: LEGAL.termsVersion,
  sections: [
    {
      heading: "Aviso de beta",
      paragraphs: [LEGAL.betaNotice],
    },
    {
      heading: "Cuándo puede cancelarse",
      paragraphs: [
        "Si el pago no se completa a tiempo, el checkout o la orden pueden expirar o cancelarse y el stock reservado se libera.",
        "Una cancelación por el comprador suele estar disponible mientras la orden sigue pendiente de pago. Después del cobro, el camino habitual es disputa, refund operativo o cancelación de plataforma.",
      ],
    },
    {
      heading: "Cuándo corresponde un refund",
      paragraphs: [
        "Un reembolso puede originarse por cancelación de vendedor, resolución de disputa, moderación de plataforma o un cobro que no debió quedar asociado a la orden.",
        "El refund lo ejecuta la operación de la plataforma contra el procesador. Los tiempos estimados pueden variar. No prometemos un SLA financiero específico en esta beta.",
      ],
    },
    {
      heading: "Pagos tardíos",
      paragraphs: [
        "Si un pago llega después de que el checkout expiró, la plataforma intenta no dejar stock y cobro inconsistentes. El resultado concreto depende del estado al procesar el evento.",
      ],
    },
    {
      heading: "Disputa",
      paragraphs: [
        "Abrir una disputa no genera un reembolso automático. El staff revisa el caso. El pago no se “libera” al vendedor por el solo hecho del reclamo; la liquidación puede quedar no elegible mientras el caso está activo.",
      ],
    },
    {
      heading: "Cancelación del vendedor y moderación",
      paragraphs: [
        "El vendedor puede no poder completar una venta (sin stock real, problema de envío, etc.). La plataforma puede cancelar o reembolsar por moderación. Eso no implica una indemnización extra.",
      ],
    },
    {
      heading: "Mercado Pago",
      paragraphs: [
        "Cuando hay cobro, Mercado Pago es el procesador. El estado interno de la plataforma (recibido / elegible para liquidación) no es un estado de Mercado Pago ni un escrow de Mercado Pago.",
        PAYMENT_COPY.held,
        PAYMENT_COPY.released,
      ],
    },
  ],
};

export const HELP_FAQS: LegalSection[] = [
  {
    heading: "Cuenta",
    paragraphs: [
      "Puedes crear una cuenta con email o, si está configurado, Google/Apple. Revisa tu correo para verificar. Desde el perfil puedes ver datos básicos, privacidad y solicitar la desactivación.",
    ],
  },
  {
    heading: "Compra",
    paragraphs: [
      "El carrito arma un checkout. El pago, en esta beta, no es dinero real de producción. Tras un cobro de prueba, el pago queda recibido por la plataforma y aún no es elegible para liquidar al vendedor hasta que la orden cumpla las reglas internas.",
    ],
  },
  {
    heading: "Venta",
    paragraphs: [
      "Completa el onboarding de vendedor, publica con datos y fotos honestos, y despacha. Si tu cuenta de vendedor se suspende, los listings activos se pausan; restaurar no los reactiva solos.",
    ],
  },
  {
    heading: "Disputa",
    paragraphs: [
      "Abre un reclamo desde la orden o Mis reclamos. Adjunta evidencia. No es un juicio ni un seguro. El staff decide según las reglas internas.",
    ],
  },
  {
    heading: "Reembolso",
    paragraphs: [
      "Un refund lo opera la plataforma. Los plazos pueden variar. Revisa /refunds. No prometemos horas fijas de acreditación.",
    ],
  },
  {
    heading: "Reportar abuso",
    paragraphs: [
      "En un listing puedes enviar un reporte. El reporte no oculta ni suspende por sí solo; entra a la cola de moderación.",
    ],
  },
];

export const LEGAL_DOCUMENTS = [
  TERMS_DOCUMENT,
  PRIVACY_DOCUMENT,
  MARKETPLACE_DOCUMENT,
  REFUNDS_DOCUMENT,
] as const;

export const REQUIRED_TERMS_HEADINGS = [
  "Elegibilidad de usuarios",
  "Cuenta y seguridad",
  "Conducta prohibida",
  "Rol de TCG Platform",
  "Publicaciones y listings",
  "Responsabilidad del vendedor sobre condición y autenticidad",
  "Órdenes",
  "Cancelaciones",
  "Disputas",
  "Moderación y suspensión",
  "Propiedad intelectual",
  "Limitaciones de la beta",
  "Disponibilidad del servicio",
  "Terminación de cuenta",
  "Contacto",
] as const;
