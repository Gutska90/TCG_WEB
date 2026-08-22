import { ApiError } from "./api";

export function userFacingError(err: unknown): string {
  if (!(err instanceof ApiError)) {
    return "No se pudo completar la acción. Inténtalo de nuevo.";
  }
  if (err.status === 401) return "Tu sesión expiró. Vuelve a ingresar.";
  if (err.status === 403) {
    if (err.code === "EMAIL_NOT_VERIFIED") return err.message;
    return err.message || "No tienes permiso para esta acción.";
  }
  if (err.status === 404) return "No encontramos lo que buscas.";
  if (err.status === 409) return err.message || "Ese movimiento no está permitido ahora.";
  if (err.status === 429) return "Demasiados intentos. Espera un momento y vuelve a intentar.";
  if (err.status >= 500) return "El servicio tuvo un problema. Inténtalo de nuevo.";
  return err.message || "No se pudo completar la acción.";
}

export function loginHref(next?: string): string {
  if (!next || next.startsWith("http") || !next.startsWith("/")) return "/ingresar";
  return `/ingresar?next=${encodeURIComponent(next)}`;
}
