export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function userFacingError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return "Tu sesión expiró. Vuelve a ingresar.";
    if (err.code === "ACCOUNT_BANNED") return "Esta cuenta está suspendida.";
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
  if (err instanceof TypeError) return "Sin conexión o la API no responde. Revisa la red e inténtalo de nuevo.";
  return "No se pudo completar la acción. Inténtalo de nuevo.";
}

export function isSessionExpired(err: unknown): boolean {
  return err instanceof ApiError && err.status === 401;
}
