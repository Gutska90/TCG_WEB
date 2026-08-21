import type {
  CardCondition,
  CardFinish,
  CardLanguage,
  OrderStatus,
  PaymentStatus,
  Role,
  ShipmentStatus,
  ShippingMethod,
  ShippingZone,
} from "@tcg/config";

export type { Role, CardCondition, CardLanguage, CardFinish, ErrorCode, ShippingMethod, OrderStatus, PaymentStatus, ShipmentStatus, ShippingZone } from "@tcg/config";

export type HealthResponse = {
  status: "ok";
};

export type ReadyResponse = {
  status: "ready" | "not_ready";
};

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};

export type PublicPlatformConfig = {
  currency: "CLP";
  country: "CL";
  locale: "es-CL";
  conditions: string[];
  finishes: string[];
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: "Bearer";
};

export type SessionView = {
  id: string;
  userAgent: string | null;
  ip: string | null;
  createdAt: string;
  expiresAt: string;
  current: boolean;
};

export type ProfileView = {
  bio: string | null;
  region: string | null;
  comuna: string | null;
  country: string;
  sellerOnboardedAt: string | null;
};

export type MeView = {
  id: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  slug: string;
  roles: Role[];
  profile: ProfileView;
  createdAt: string;
};

export type PublicUserView = {
  id: string;
  displayName: string;
  slug: string;
  profile: Pick<ProfileView, "bio" | "comuna" | "region" | "country">;
  createdAt: string;
  reputation: ReputationView;
};

export type ReputationView = {
  averageStars: number | null;
  count: number;
};

export type AddressView = {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  line1: string;
  line2: string | null;
  comuna: string;
  region: string;
  postalCode: string | null;
  isDefaultShipping: boolean;
};

export type FileUploadView = {
  fileId: string;
  uploadUrl: string | null;
  storage: "deferred" | "object";
};

export type ListingStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "SOLD" | "CANCELLED";

export type ListingSellerView = {
  id: string;
  displayName: string;
  slug: string;
  reputation: ReputationView;
};

export type ListingView = {
  id: string;
  status: ListingStatus;
  productType: "SINGLE";
  title: string;
  condition: CardCondition;
  quantity: number;
  quantityReserved: number;
  available: number;
  priceClp: number;
  description: string;
  allowsMeetup: boolean;
  allowsShipping: boolean;
  graded: boolean;
  grader: string | null;
  grade: string | null;
  publishedAt: string | null;
  createdAt: string;
  seller: ListingSellerView;
  variant: VariantView & { card: CardSummaryView };
  images: Array<{ fileId: string; sortOrder: number }>;
};

export type PriceSuggestionView = {
  currency: "CLP";
  market: number | null;
  minListing: number | null;
  avgListing: number | null;
  activeListings: number;
  suggested: number | null;
};

export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

export type GameView = {
  id: string;
  slug: string;
  name: string;
  publisher: string;
  sortOrder: number;
};

export type SetSummaryView = {
  id: string;
  code: string;
  slug: string;
  name: string;
  releasedAt: string | null;
  cardCount: number;
  imageUrl: string | null;
};

export type CardSummaryView = {
  id: string;
  slug: string;
  name: string;
  number: string;
  rarity: string;
  imageUrl: string | null;
  gameSlug: string;
  setSlug: string;
};

export type VariantView = {
  id: string;
  language: CardLanguage;
  finish: CardFinish;
  finishDetail: string;
  isDefault: boolean;
};

export type CardDetailView = {
  id: string;
  slug: string;
  name: string;
  number: string;
  rarity: string;
  supertype: string;
  imageUrl: string | null;
  attributes: Record<string, unknown>;
  game: Pick<GameView, "id" | "slug" | "name">;
  set: Pick<SetSummaryView, "id" | "code" | "slug" | "name">;
  variants: VariantView[];
  market: {
    currency: "CLP";
    marketPrice: number | null;
    minListing: number | null;
    avgListing: number | null;
    activeListings: number;
  };
};

export type VariantDetailView = {
  variant: VariantView & {
    card: CardSummaryView;
  };
  listings: ListingView[];
  market: CardDetailView["market"];
};

export type FavoriteView = {
  id: string;
  variant: VariantView;
  card: CardSummaryView;
};

export type SearchCardView = CardSummaryView & {
  gameName: string;
  setName: string;
  setCode: string;
};

export type CartItemIssue = "LISTING_NOT_ACTIVE" | "LISTING_INSUFFICIENT_STOCK" | "OWN_LISTING";

export type CartItemView = {
  listingId: string;
  quantity: number;
  lineTotalClp: number;
  purchasable: boolean;
  issue: CartItemIssue | null;
  listing: ListingView;
};

export type CartSellerGroupView = {
  seller: ListingSellerView;
  items: CartItemView[];
  subtotalClp: number;
};

export type CartView = {
  id: string;
  groups: CartSellerGroupView[];
  items: CartItemView[];
  productTotalClp: number;
  itemCount: number;
};

export type OrderItemView = {
  listingId: string;
  variantId: string;
  titleSnapshot: string;
  condition: CardCondition;
  quantity: number;
  unitPriceClp: number;
  lineTotalClp: number;
};

export type OrderPaymentView = {
  id: string;
  status: PaymentStatus;
  amountClp: number;
  heldAt: string | null;
  releasedAt: string | null;
};

export type OrderView = {
  id: string;
  orderNumber: string;
  checkoutId: string;
  status: OrderStatus;
  subtotalClp: number;
  shippingClp: number;
  commissionClp: number;
  totalClp: number;
  shippingMethod: ShippingMethod;
  trackingCode: string | null;
  meetupAt: string | null;
  meetupPlace: string | null;
  notes: string;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  confirmedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  buyer: { id: string; displayName: string; slug: string };
  seller: { id: string; displayName: string; slug: string };
  items: OrderItemView[];
  payment: OrderPaymentView | null;
  shipment: ShipmentView | null;
  rating: SellerRatingView | null;
};

export type SellerRatingView = {
  id: string;
  orderId: string;
  stars: number;
  comment: string;
  isPublic: boolean;
  createdAt: string;
  from: { id: string; displayName: string; slug: string };
};

export type SellerRatingsPageView = Paginated<SellerRatingView> & {
  summary: ReputationView;
};

export type ShipmentView = {
  id: string;
  orderId: string;
  method: ShippingMethod;
  status: ShipmentStatus;
  carrier: string | null;
  trackingCode: string | null;
  trackingUrl: string | null;
  meetupAt: string | null;
  meetupPlace: string | null;
  labelUrl: string | null;
};

export type ShippingQuoteView = {
  sellerId: string;
  method: ShippingMethod;
  originComuna: string;
  destComuna: string;
  originZone: ShippingZone;
  destZone: ShippingZone;
  priceClp: number;
};

export type CheckoutView = {
  id: string;
  status: "PENDING_PAYMENT" | "PAID" | "EXPIRED" | "CANCELLED";
  totalClp: number;
  expiresAt: string;
  createdAt: string;
  orders: OrderView[];
  mercadopago: {
    initPoint: string | null;
    sandboxInitPoint: string | null;
    mock: boolean;
  };
};
