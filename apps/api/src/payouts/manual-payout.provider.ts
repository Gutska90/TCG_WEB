import { HttpStatus, Injectable } from "@nestjs/common";
import { ERROR_CODES } from "@tcg/config";
import { AppError } from "../common/errors/app-error";
import type { PayoutMarkPaidInput, PayoutPrepareInput, PayoutProvider } from "./payout-provider";

@Injectable()
export class ManualPayoutProvider implements PayoutProvider {
  async prepare(_input: PayoutPrepareInput): Promise<void> {
    return;
  }

  async markPaid(input: PayoutMarkPaidInput): Promise<{ providerRef: string }> {
    const providerRef = input.providerRef.trim();
    if (!providerRef) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ERROR_CODES.PAYOUT_PROVIDER_REF_REQUIRED,
        "providerRef es obligatorio para marcar un payout como pagado",
      );
    }
    return { providerRef };
  }

  async getReference(_payoutId: string): Promise<string | null> {
    return null;
  }
}
