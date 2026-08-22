import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

export type RequestContextStore = {
  requestId: string;
  userId?: string;
  checkoutId?: string;
  orderId?: string;
  paymentId?: string;
  providerPaymentId?: string;
  refundId?: string;
  payoutId?: string;
  reconciliationRunId?: string;
  disputeId?: string;
};

const storage = new AsyncLocalStorage<RequestContextStore>();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function resolveRequestId(header: string | string[] | undefined): string {
  const raw = Array.isArray(header) ? header[0] : header;
  if (raw && UUID_RE.test(raw.trim())) return raw.trim();
  return randomUUID();
}

export function runWithRequestContext<T>(store: RequestContextStore, fn: () => T): T {
  return storage.run(store, fn);
}

export function requestContext(): RequestContextStore | undefined {
  return storage.getStore();
}

export function currentRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}

export function patchRequestContext(patch: Partial<RequestContextStore>): void {
  const current = storage.getStore();
  if (!current) return;
  Object.assign(current, patch);
}
