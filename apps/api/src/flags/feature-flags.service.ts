import { HttpStatus, Injectable } from "@nestjs/common";
import {
  ERROR_CODES,
  loadFeatureFlags,
  type FeatureFlagSnapshot,
} from "@tcg/config";
import { AppError } from "../common/errors/app-error";

@Injectable()
export class FeatureFlagsService {
  private snapshot: FeatureFlagSnapshot = loadFeatureFlags();

  use(snapshot: FeatureFlagSnapshot): this {
    this.snapshot = snapshot;
    return this;
  }

  current(): FeatureFlagSnapshot {
    return this.snapshot;
  }

  assertCheckoutAllowed(): void {
    if (this.snapshot.disableCheckout) {
      throw new AppError(
        HttpStatus.SERVICE_UNAVAILABLE,
        ERROR_CODES.SERVICE_TEMPORARILY_DISABLED,
        "Checkout temporalmente deshabilitado",
      );
    }
  }

  assertNewListingsAllowed(): void {
    if (this.snapshot.disableNewListings) {
      throw new AppError(
        HttpStatus.SERVICE_UNAVAILABLE,
        ERROR_CODES.SERVICE_TEMPORARILY_DISABLED,
        "Altas de publicaciones temporalmente deshabilitadas",
      );
    }
  }

  assertOauthEnabled(provider: "google" | "apple"): void {
    const enabled = provider === "google" ? this.snapshot.enableGoogleAuth : this.snapshot.enableAppleAuth;
    if (!enabled) {
      throw new AppError(
        HttpStatus.FORBIDDEN,
        ERROR_CODES.FEATURE_DISABLED,
        provider === "google" ? "Google no está habilitado" : "Apple no está habilitado",
      );
    }
  }

  assertPricesAllowed(): void {
    if (!this.snapshot.enablePrices) {
      throw new AppError(HttpStatus.FORBIDDEN, ERROR_CODES.FEATURE_DISABLED, "Historial de precios no está habilitado");
    }
  }

  assertWishlistAllowed(): void {
    if (!this.snapshot.enableWishlist) {
      throw new AppError(HttpStatus.FORBIDDEN, ERROR_CODES.FEATURE_DISABLED, "Wishlist no está habilitada");
    }
  }

  assertCollectionsAllowed(): void {
    if (!this.snapshot.enableCollections) {
      throw new AppError(HttpStatus.FORBIDDEN, ERROR_CODES.FEATURE_DISABLED, "Colecciones no están habilitadas");
    }
  }

  assertPayoutsAllowed(): void {
    if (this.snapshot.disablePayouts) {
      throw new AppError(
        HttpStatus.SERVICE_UNAVAILABLE,
        ERROR_CODES.SERVICE_TEMPORARILY_DISABLED,
        "Payouts temporalmente deshabilitados",
      );
    }
    if (!this.snapshot.enablePayouts) {
      throw new AppError(HttpStatus.FORBIDDEN, ERROR_CODES.FEATURE_DISABLED, "Payouts no están habilitados");
    }
  }

  refundsAutomationAllowed(): boolean {
    return !this.snapshot.disableRefundsAutomation && this.snapshot.refundRetryJobEnabled;
  }
}

export function flagsForTest(overrides: Partial<FeatureFlagSnapshot> = {}): FeatureFlagsService {
  return new FeatureFlagsService().use({
    ...loadFeatureFlags({ NODE_ENV: "test" }),
    ...overrides,
  });
}
