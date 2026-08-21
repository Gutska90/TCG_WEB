import { HttpException, HttpStatus } from "@nestjs/common";

export class AppError extends HttpException {
  readonly code: string;

  constructor(
    status: HttpStatus,
    code: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super({ error: { code, message, details } }, status);
    this.code = code;
  }
}
