import { Injectable, type NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { MetricsService } from "./metrics.service";
import { resolveRequestId, runWithRequestContext } from "./request-context";

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly metrics: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = resolveRequestId(req.header("x-request-id"));
    const started = Date.now();
    res.setHeader("x-request-id", requestId);
    runWithRequestContext({ requestId }, () => {
      res.on("finish", () => {
        const durationMs = Date.now() - started;
        this.metrics.inc("http_requests_total");
        this.metrics.observe("http_request_duration", durationMs);
        if (res.statusCode >= 500) this.metrics.inc("http_5xx_total");
        process.stdout.write(
          `${JSON.stringify({
            level: "info",
            time: new Date().toISOString(),
            msg: "http.request",
            requestId,
            method: req.method,
            route: req.route ? String((req.route as { path?: string }).path ?? req.path) : req.path,
            statusCode: res.statusCode,
            durationMs,
          })}\n`,
        );
      });
      next();
    });
  }
}
