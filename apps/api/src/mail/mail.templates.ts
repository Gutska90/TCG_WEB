import { LEGAL } from "@tcg/config";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderTransactionalHtml(input: {
  preheader?: string;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
}): string {
  const preheader = input.preheader ? `<span style="display:none">${escapeHtml(input.preheader)}</span>` : "";
  const paragraphs = input.body
    .split(/\n{2,}/)
    .map((block) => `<p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.5">${escapeHtml(block).replaceAll("\n", "<br/>")}</p>`)
    .join("");
  const cta = input.ctaUrl
    ? `<p style="margin:24px 0 0"><a href="${escapeHtml(input.ctaUrl)}" style="display:inline-block;background:#7C3AED;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:12px;font-weight:600">${escapeHtml(input.ctaLabel ?? "Abrir")}</a></p>`
    : "";
  return `<!doctype html>
<html lang="es">
<body style="margin:0;background:#F8FAFC;font-family:Arial,Helvetica,sans-serif">
${preheader}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F8FAFC;padding:24px 12px">
  <tr>
    <td align="center">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #E2E8F0;border-radius:16px;padding:28px">
        <tr>
          <td>
            <p style="margin:0 0 8px;color:#7C3AED;font-size:12px;font-weight:700;letter-spacing:.08em">TCG MARKET · CHILE · BETA</p>
            <h1 style="margin:0 0 16px;color:#0F172A;font-size:22px">${escapeHtml(input.title)}</h1>
            ${paragraphs}
            ${cta}
            <p style="margin:28px 0 0;color:#64748B;font-size:12px;line-height:1.5">${escapeHtml(LEGAL.betaNotice)}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

export function verificationEmailHtml(webUrl: string, token: string): string {
  const url = `${webUrl}/verificar-email?token=${token}`;
  return renderTransactionalHtml({
    preheader: "Confirma tu email para usar TCG Market.",
    title: "Verifica tu email",
    body: "Usa el botón para confirmar tu cuenta. El enlace caduca.",
    ctaLabel: "Verificar email",
    ctaUrl: url,
  });
}

export function passwordResetEmailHtml(webUrl: string, token: string): string {
  const url = `${webUrl}/recuperar-password?token=${token}`;
  return renderTransactionalHtml({
    preheader: "Restablece tu contraseña de TCG Market.",
    title: "Restablece tu contraseña",
    body: "Si no pediste este cambio, ignora este correo. El enlace caduca en una hora.",
    ctaLabel: "Elegir contraseña nueva",
    ctaUrl: url,
  });
}

export function notificationEmailHtml(title: string, body: string): string {
  return renderTransactionalHtml({ title, body });
}
