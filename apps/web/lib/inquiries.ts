import type { Paginated, SellerInquiryView } from "@tcg/types";
import { api } from "./api";

export function createInquiry(sellerId: string, cartUrl?: string): Promise<SellerInquiryView> {
  return api<SellerInquiryView>("/v1/inquiries", {
    method: "POST",
    body: JSON.stringify({ sellerId, ...(cartUrl ? { cartUrl } : {}) }),
  });
}

export function listInquiries(as: "buyer" | "seller"): Promise<Paginated<SellerInquiryView>> {
  return api<Paginated<SellerInquiryView>>(`/v1/me/inquiries?as=${as}&pageSize=50`);
}

export function getInquiry(id: string): Promise<SellerInquiryView> {
  return api<SellerInquiryView>(`/v1/inquiries/${id}`);
}
