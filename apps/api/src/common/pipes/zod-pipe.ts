import { type PipeTransform, Injectable } from "@nestjs/common";
import { HttpStatus } from "@nestjs/common";
import type { ZodType } from "zod";
import { ERROR_CODES } from "@tcg/config";
import { AppError } from "../errors/app-error";

@Injectable()
export class ZodPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const parsed = this.schema.safeParse(value ?? {});
    if (!parsed.success) {
      throw new AppError(HttpStatus.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, "Datos inválidos", {
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
    }
    return parsed.data;
  }
}
