import type { FeePreviewView, SellerPlanView } from "@tcg/types";
import { api } from "./api";

export function fetchSellerPlan(): Promise<SellerPlanView> {
  return api<SellerPlanView>("/v1/me/seller-plan");
}

export function previewSellerFee(amountClp: number): Promise<FeePreviewView> {
  return api<FeePreviewView>("/v1/me/seller-plan/fee-preview", {
    method: "POST",
    body: JSON.stringify({ amountClp }),
  });
}
