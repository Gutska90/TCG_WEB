import { Injectable } from "@nestjs/common";

type CounterName =
  | "http_requests_total"
  | "http_5xx_total"
  | "checkout_created_total"
  | "checkout_failed_total"
  | "stock_conflict_total"
  | "payment_approved_total"
  | "payment_failed_total"
  | "refund_failed_total"
  | "webhook_invalid_total"
  | "payout_failed_total"
  | "reconciliation_issue_total"
  | "dispute_opened_total"
  | "report_opened_total";

type HistogramName = "http_request_duration" | "search_duration" | "checkout_duration";

type Histogram = { count: number; sumMs: number };

@Injectable()
export class MetricsService {
  private readonly counters = new Map<CounterName, number>();
  private readonly histograms = new Map<HistogramName, Histogram>();

  inc(name: CounterName, by = 1): void {
    this.counters.set(name, (this.counters.get(name) ?? 0) + by);
  }

  observe(name: HistogramName, durationMs: number): void {
    const current = this.histograms.get(name) ?? { count: 0, sumMs: 0 };
    current.count += 1;
    current.sumMs += durationMs;
    this.histograms.set(name, current);
  }

  snapshot(): {
    counters: Record<string, number>;
    histograms: Record<string, { count: number; sumMs: number; avgMs: number }>;
  } {
    const counters: Record<string, number> = {};
    for (const [key, value] of this.counters) counters[key] = value;
    const histograms: Record<string, { count: number; sumMs: number; avgMs: number }> = {};
    for (const [key, value] of this.histograms) {
      histograms[key] = {
        count: value.count,
        sumMs: value.sumMs,
        avgMs: value.count === 0 ? 0 : Math.round(value.sumMs / value.count),
      };
    }
    return { counters, histograms };
  }
}
