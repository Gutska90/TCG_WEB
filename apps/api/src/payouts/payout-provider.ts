export const PAYOUT_PROVIDER = "PAYOUT_PROVIDER";

export type PayoutPrepareInput = {
  payoutId: string;
  sellerId: string;
  amountClp: number;
};

export type PayoutMarkPaidInput = {
  payoutId: string;
  providerRef: string;
};

export type PayoutProvider = {
  prepare(input: PayoutPrepareInput): Promise<void>;
  markPaid(input: PayoutMarkPaidInput): Promise<{ providerRef: string }>;
  getReference(payoutId: string): Promise<string | null>;
};
