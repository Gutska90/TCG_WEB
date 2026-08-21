import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Response } from "express";
import { ERROR_CODES } from "@tcg/config";

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === "object" && body !== null && "error" in body) {
        res.status(status).json(body);
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

      res.status(status).json({ error: { code, message } });
      return;
    }

    this.logger.error(exception);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: { code: ERROR_CODES.INTERNAL, message: "Error interno" },
    });
  }
}
