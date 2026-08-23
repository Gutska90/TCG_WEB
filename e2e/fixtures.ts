export const BETA_USERS = {
  buyer: {
    email: "buyer.beta@example.test",
    password: "BetaPassw0rd!",
  },
  seller: {
    email: "seller.beta@example.test",
    password: "BetaPassw0rd!",
  },
  admin: {
    email: "admin.beta@example.test",
    password: "BetaPassw0rd!",
  },
} as const;

export const SEARCH_CARD = "Test Mon #1";

/** Keep in sync with apps/api/src/catalog/beta-seed.ts */
export const QA_REFUND_REASON = "QA_B4_REFUND_RETRY";
export const QA_REFUND_ORDER_PREFIX = "TCG-QA-B4";
