import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { Response } from "express";
import { ERROR_CODES } from "@tcg/config";
import { ErrorTrackingService } from "../../observability/error-tracking.service";
import { currentRequestId } from "../../observability/request-context";

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  constructor(private readonly errors: ErrorTrackingService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const requestId = currentRequestId() ?? null;

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      if (status >= 500) this.errors.capture(exception, { statusCode: status });
      if (typeof body === "object" && body !== null && "error" in body) {
        const payload = body as { error: Record<string, unknown> };
        res.status(status).json({
          error: { ...payload.error, requestId },
        });
        return;
      }

      const message =
        typeof body === "string"
          ? body
          : typeof body === "object" && body !== null && "message" in body
            ? String((body as { message: unknown }).message)
            : "Error";

      const code =
        status === HttpStatus.TOO_MANY_REQUESTS
          ? ERROR_CODES.RATE_LIMITED
          : status === HttpStatus.UNAUTHORIZED
            ? ERROR_CODES.UNAUTHORIZED
            : status === HttpStatus.FORBIDDEN
              ? ERROR_CODES.FORBIDDEN
              : status === HttpStatus.NOT_FOUND
                ? ERROR_CODES.NOT_FOUND
                : ERROR_CODES.INTERNAL;

      res.status(status).json({ error: { code, message, requestId } });
      return;
    }

    this.errors.capture(exception, { statusCode: 500 });
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: { code: ERROR_CODES.INTERNAL, message: "Error interno", requestId },
    });
  }
}
