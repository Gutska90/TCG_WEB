import { ConsoleLogger, Injectable, type LoggerService } from "@nestjs/common";
import { currentRequestId, requestContext } from "./request-context";
import { redactRecord, safeErrorMessage } from "./redact";

@Injectable()
export class JsonLogger extends ConsoleLogger implements LoggerService {
  override log(message: unknown, ...optionalParams: unknown[]): void {
    this.write("info", message, optionalParams);
  }

  override error(message: unknown, ...optionalParams: unknown[]): void {
    this.write("error", message, optionalParams);
  }

  override warn(message: unknown, ...optionalParams: unknown[]): void {
    this.write("warn", message, optionalParams);
  }

  override debug(message: unknown, ...optionalParams: unknown[]): void {
    this.write("debug", message, optionalParams);
  }

  override verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.write("info", message, optionalParams);
  }

  private write(level: string, message: unknown, optionalParams: unknown[]): void {
    const ctx = requestContext();
    const contextName = typeof optionalParams[optionalParams.length - 1] === "string"
      ? String(optionalParams[optionalParams.length - 1])
      : this.context;
    const payload: Record<string, unknown> = {
      level,
      time: new Date().toISOString(),
      msg: typeof message === "string" ? message : safeErrorMessage(message),
      context: contextName,
      requestId: currentRequestId() ?? null,
    };
    if (ctx) {
      payload.userId = ctx.userId ?? null;
      payload.checkoutId = ctx.checkoutId ?? null;
      payload.orderId = ctx.orderId ?? null;
      payload.paymentId = ctx.paymentId ?? null;
      payload.refundId = ctx.refundId ?? null;
      payload.payoutId = ctx.payoutId ?? null;
      payload.disputeId = ctx.disputeId ?? null;
    }
    process.stdout.write(`${JSON.stringify(redactRecord(payload))}\n`);
  }
}
