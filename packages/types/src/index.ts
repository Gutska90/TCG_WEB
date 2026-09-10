import type {
  CardCondition,
  CardFinish,
  CardLanguage,
  CatalogFilterGroup,
  CatalogFilterSupport,
  CatalogFilterType,
  CatalogFilterVisibleWhen,
  CatalogSubmissionStatus,
  DisputeEvidenceType,
  DisputeReason,
  DisputeStatus,
  FeedbackCategory,
  JobRunStatus,
  LedgerEntryType,
  ListingStatus,
  ModerationActionType,
  NotificationType,
  OrderStatus,
  PaymentStatus,
  PayoutMethod,
  PayoutStatus,
  ReconciliationIssueStatus,
  ReconciliationIssueType,
  ReconciliationRunStatus,
  ReconciliationSeverity,
  RefundStatus,
  ReportReason,
  ReportStatus,
  ReportTargetType,
  Role,
  ShipmentStatus,
  ShippingMethod,
  ShippingZone,
} from "@tcg/config";

export type {
  Role,
  CardCondition,
  CardLanguage,
  CardFinish,
  CatalogSubmissionStatus,
  ErrorCode,
  LedgerEntryType,
  ListingStatus,
  ShippingMethod,
  OrderStatus,
  PaymentStatus,
  PayoutMethod,
  PayoutStatus,
  ReconciliationIssueStatus,
  ReconciliationIssueType,
  ReconciliationRunStatus,
  ReconciliationSeverity,
  RefundStatus,
  DisputeReason,
  DisputeStatus,
  DisputeEvidenceType,
  JobRunStatus,
  FeedbackCategory,
  ReportTargetType,
  ReportReason,
  ReportStatus,
  ModerationActionType,
  NotificationType,
  ShipmentStatus,
  ShippingZone,
} from "@tcg/config";

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
  legal: {
    termsVersion: string;
    privacyVersion: string;
    beta: true;
  };
  features: {
    enableCollections: boolean;
    enablePrices: boolean;
    enableWishlist: boolean;
    enableScanner: boolean;
    enableStores: boolean;
    enableAuctions: boolean;
    enableSellerPlans: boolean;
    enablePayouts: boolean;
    paymentsSandbox: boolean;
    enableGoogleAuth: boolean;
    enableAppleAuth: boolean;
    authStub: boolean;
  };
  sellerPlans: {
    policyVersion: string;
    plans: Array<{
      plan: string;
      label: string;
      monthlyPriceClp: number;
      platformFeeBps: number;
      platformFeeCapClp: number;
    }>;
    launchPromo: {
      enabled: boolean;
      active: boolean;
      code: string;
      startsAt: string | null;
      endsAt: string | null;
      feeBps: number;
      feeCapClp: number;
    };
  };
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

export type AuthIdentityView = {
  provider: "EMAIL" | "GOOGLE" | "APPLE";
  createdAt: string;
};

export type AuthMethodsView = {
  hasPassword: boolean;
  identities: AuthIdentityView[];
};

export type ProfileView = {
  bio: string | null;
  region: string | null;
  comuna: string | null;
  country: string;
  sellerOnboardedAt: string | null;
  contactWhatsapp: string | null;
  contactWhatsappEnabled: boolean;
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
  legal: {
    termsVersion: string | null;
    privacyVersion: string | null;
    acceptedAt: string | null;
    marketingOptIn: boolean;
    currentTermsVersion: string;
    currentPrivacyVersion: string;
    stale: boolean;
    deletionRequestedAt: string | null;
  };
};

export type PublicUserView = {
  id: string;
  displayName: string;
  slug: string;
  profile: Pick<ProfileView, "bio" | "comuna" | "region" | "country">;
  createdAt: string;
  reputation: ReputationView;
  activeListingCount: number;
  completedSaleCount: number;
  contactWhatsappEnabled: boolean;
  contactWhatsapp: string | null;
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

export type ListingSellerView = {
  id: string;
  displayName: string;
  slug: string;
  reputation: ReputationView;
  contactWhatsappEnabled: boolean;
  contactWhatsapp: string | null;
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
  images: Array<{ fileId: string; sortOrder: number; url: string }>;
};

export type PriceSuggestionView = {
  currency: "CLP";
  market: number | null;
  minListing: number | null;
  avgListing: number | null;
  activeListings: number;
  suggested: number | null;
};

export type PriceHistoryPointView = {
  t: string;
  min: number | null;
  avg: number | null;
  sale: number | null;
};

export type PriceHistoryView = {
  currency: "CLP";
  range: "1m" | "3m" | "6m" | "1a";
  current: number | null;
  min: number | null;
  avg: number | null;
  max: number | null;
  volumeSold: number;
  lastSaleClp: number | null;
  avg30dClp: number | null;
  median30dClp: number | null;
  minListingClp: number | null;
  confidence: "HIGH" | "MEDIUM" | "LOW" | null;
  points: PriceHistoryPointView[];
  disclaimer: string;
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

export type CardAttributeFieldView = {
  key: string;
  label: string;
  value: string;
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
  attributeFields: CardAttributeFieldView[];
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

export type GameFilterOptionView = {
  value: string;
  label: string;
  /** Facet count when the API can compute it in batch; omitted in CATALOG.1 MVP. */
  count?: number;
};

export type GameFilterView = {
  key: string;
  label: string;
  group: CatalogFilterGroup;
  type: CatalogFilterType;
  tier: "PRIMARY" | "ADVANCED";
  multi: boolean;
  range: boolean;
  order: number;
  visibleWhen?: CatalogFilterVisibleWhen;
  options: GameFilterOptionView[];
};

export type GameFiltersView = {
  game: Pick<GameView, "id" | "slug" | "name">;
  support: CatalogFilterSupport;
  source: string;
  missing: string[];
  filters: GameFilterView[];
};

export type AdminCardAttributesView = {
  cardId: string;
  gameSlug: string;
  raw: Record<string, unknown>;
  validated: Record<string, unknown>;
  unknownKeys: string[];
  valid: boolean;
  issues: Array<{ path: string; message: string }>;
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

export type WishlistItemView = {
  id: string;
  variantId: string;
  targetPriceClp: number;
  notifyBelow: boolean;
  currentMinClp: number | null;
  hit: boolean;
  createdAt: string;
  variant: VariantView;
  card: CardSummaryView;
};

export type NotificationView = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};

export type NotificationListView = Paginated<NotificationView> & {
  unreadCount: number;
};

export type NotificationPreferenceView = {
  type: NotificationType;
  inApp: boolean;
  email: boolean;
  push: boolean;
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
  marketplaceFee: {
    policyVersion: string | null;
    planCode: string | null;
    promotionCode: string | null;
    feeBps: number | null;
    feeCapClp: number | null;
  } | null;
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

export type AdminPartyView = {
  id: string;
  displayName: string;
  slug: string;
  email: string;
};

export type AdminAlertView = {
  code: string;
  label: string;
  count: number;
  href: string;
};

export type AdminDashboardView = {
  generatedAt: string;
  timezone: "America/Santiago";
  operation: {
    usersTotal: number;
    sellersTotal: number;
    listingsActive: number;
    ordersCreatedToday: number;
    ordersPendingShipment: number;
    ordersDisputed: number;
    refundsPending: number;
    refundsFailed: number;
  };
  money: {
    currency: "CLP";
    gmvTodayClp: number;
    gmvLast30dClp: number;
    paymentsHeld: number;
    paymentsReleased: number;
    amountHeldClp: number;
    amountReleasedClp: number;
    collectedMpClp: number;
    pendingSellerHeldClp: number;
    platformCommissionOpenClp: number;
    refundsPending: number;
    refundsPendingClp: number;
    payoutsPending: number;
    payoutsPendingClp: number;
  };
  alerts: AdminAlertView[];
};

export type AdminOrderListItem = {
  id: string;
  orderNumber: string;
  checkoutId: string;
  status: OrderStatus;
  subtotalClp: number;
  shippingClp: number;
  commissionClp: number;
  totalClp: number;
  createdAt: string;
  paidAt: string | null;
  buyer: AdminPartyView;
  seller: AdminPartyView;
  payment: {
    id: string;
    status: PaymentStatus;
    amountClp: number;
    providerPaymentId: string | null;
  } | null;
};

export type AdminPaymentListItem = {
  id: string;
  orderId: string;
  orderNumber: string;
  status: PaymentStatus;
  amountClp: number;
  provider: string;
  providerPaymentId: string | null;
  heldAt: string | null;
  releasedAt: string | null;
  refundedAt: string | null;
  createdAt: string;
};

export type AdminRefundListItem = {
  id: string;
  paymentId: string;
  orderId: string;
  orderNumber: string;
  amountClp: number;
  reason: string;
  status: RefundStatus;
  providerRefundId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminAuditEventView = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  actorId: string | null;
  createdAt: string;
  metadata: Record<string, unknown> | null;
};

export type AdminCheckoutSummaryView = {
  id: string;
  status: "PENDING_PAYMENT" | "PAID" | "EXPIRED" | "CANCELLED";
  totalClp: number;
  expiresAt: string;
  createdAt: string;
};

export type AdminOrderDetailView = {
  id: string;
  orderNumber: string;
  checkoutId: string;
  status: OrderStatus;
  subtotalClp: number;
  shippingClp: number;
  commissionClp: number;
  totalClp: number;
  shippingMethod: ShippingMethod;
  notes: string;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  confirmedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  buyer: AdminPartyView;
  seller: AdminPartyView;
  items: OrderItemView[];
  shipment: ShipmentView | null;
  checkout: AdminCheckoutSummaryView;
  payment: AdminPaymentListItem | null;
  refunds: AdminRefundListItem[];
  timeline: AdminAuditEventView[];
  marketplaceFee: {
    policyVersion: string | null;
    planCode: string | null;
    promotionCode: string | null;
    feeBps: number | null;
    feeCapClp: number | null;
    platformFeeClp: number;
    sellerPayableClp: number;
    processorFeeClp: null;
  };
};

export type AdminPaymentDetailView = AdminPaymentListItem & {
  order: { id: string; orderNumber: string; status: OrderStatus };
  refunds: AdminRefundListItem[];
};

export type AdminRefundDetailView = AdminRefundListItem & {
  lastError: string | null;
  payment: {
    id: string;
    status: PaymentStatus;
    amountClp: number;
    providerPaymentId: string | null;
  };
  order: { id: string; orderNumber: string; status: OrderStatus };
};

export type AdminRefundRetryView = {
  refund: AdminRefundDetailView;
  outcome: "completed" | "pending" | "failed";
  providerCalled: boolean;
};

export type AdminUserListItem = {
  id: string;
  email: string;
  displayName: string;
  slug: string;
  roles: Role[];
  emailVerified: boolean;
  isBanned: boolean;
  createdAt: string;
};

export type SellerBalanceView = {
  sellerId: string;
  pendingClp: number;
  availableClp: number;
  reservedClp: number;
  paidClp: number;
  disputedClp: number;
  netClp: number;
};

export type LedgerEntryView = {
  id: string;
  sellerId: string | null;
  entryType: LedgerEntryType;
  amountClp: number;
  orderId: string | null;
  paymentId: string | null;
  refundId: string | null;
  payoutId: string | null;
  idempotencyKey: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type AdminPayoutListItem = {
  id: string;
  seller: AdminPartyView;
  amountClp: number;
  status: PayoutStatus;
  method: PayoutMethod;
  providerRef: string | null;
  orderCount: number;
  createdAt: string;
  paidAt: string | null;
};

export type AdminPayoutItemView = {
  id: string;
  orderId: string;
  orderNumber: string;
  grossClp: number;
  commissionClp: number;
  netClp: number;
};

export type AdminPayoutDetailView = {
  id: string;
  seller: AdminPartyView;
  amountClp: number;
  status: PayoutStatus;
  method: PayoutMethod;
  providerRef: string | null;
  lastError: string | null;
  periodStart: string;
  periodEnd: string;
  approvedById: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  createdAt: string;
  items: AdminPayoutItemView[];
  ledger: LedgerEntryView[];
  timeline: AdminAuditEventView[];
};

export type AdminListingListItem = {
  id: string;
  title: string;
  status: ListingStatus;
  priceClp: number;
  quantity: number;
  quantityReserved: number;
  seller: AdminPartyView;
  createdAt: string;
};

export type ReconciliationRunView = {
  id: string;
  provider: string;
  startedAt: string;
  finishedAt: string | null;
  status: ReconciliationRunStatus;
  checkedPayments: number;
  checkedRefunds: number;
  issuesFound: number;
  criticalIssues: number;
  createdById: string | null;
  windowStart: string | null;
  windowEnd: string | null;
  providerSkipped: boolean;
};

export type ReconciliationRunDetailView = ReconciliationRunView & {
  issues: ReconciliationIssueView[];
};

export type ReconciliationIssueView = {
  id: string;
  runId: string;
  issueType: ReconciliationIssueType;
  severity: ReconciliationSeverity;
  entityType: string;
  entityId: string | null;
  providerPaymentId: string | null;
  providerRefundId: string | null;
  expectedStatus: string | null;
  actualStatus: string | null;
  expectedAmountClp: number | null;
  actualAmountClp: number | null;
  status: ReconciliationIssueStatus;
  details: Record<string, unknown>;
  createdAt: string;
  resolvedAt: string | null;
  resolvedById: string | null;
  resolutionNote: string | null;
};

export type ReconciliationDashboardView = {
  lastRun: ReconciliationRunView | null;
  openIssues: number;
  openCritical: number;
};

export type PublicPartyView = {
  id: string;
  displayName: string;
  slug: string;
};

export type DisputeListItem = {
  id: string;
  orderId: string;
  orderNumber: string;
  reason: DisputeReason;
  status: DisputeStatus;
  openedAt: string;
  resolvedAt: string | null;
};

export type DisputeMessageView = {
  id: string;
  author: PublicPartyView;
  body: string;
  isInternalAdminNote: boolean;
  createdAt: string;
};

export type DisputeEvidenceView = {
  id: string;
  uploadedById: string;
  fileId: string;
  mime: string;
  size: number;
  evidenceType: DisputeEvidenceType;
  description: string;
  createdAt: string;
};

export type ListingRevisionView = {
  id: string;
  listingId: string;
  actorId: string;
  source: string;
  reason: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  createdAt: string;
};

export type DisputeDetailView = {
  id: string;
  orderId: string;
  orderNumber: string;
  reason: DisputeReason;
  status: DisputeStatus;
  resolution: string | null;
  openedAt: string;
  resolvedAt: string | null;
  buyer: PublicPartyView;
  seller: PublicPartyView;
  assignedAdminId: string | null;
  messages: DisputeMessageView[];
  evidence: DisputeEvidenceView[];
};

export type AdminDisputeDetailView = DisputeDetailView & {
  buyerEmail: string;
  sellerEmail: string;
  payment: {
    id: string;
    status: PaymentStatus;
    amountClp: number;
  } | null;
  refunds: Array<{ id: string; status: RefundStatus; amountClp: number }>;
  shipment: { id: string; status: ShipmentStatus } | null;
  listingRevisions: ListingRevisionView[];
  timeline: AdminAuditEventView[];
};

export type ReportListItem = {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  status: ReportStatus;
  createdAt: string;
};

export type ReportDetailView = ReportListItem & {
  reporter: PublicPartyView;
  description: string;
  assignedAdminId: string | null;
  resolvedAt: string | null;
};

export type AdminReportDetailView = ReportDetailView & {
  reporterEmail: string;
  targetSummary: string;
  priorActions: ModerationActionView[];
};

export type ModerationActionView = {
  id: string;
  actorAdminId: string;
  targetType: string;
  targetId: string;
  actionType: ModerationActionType;
  reason: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type SellerSuspensionView = {
  id: string;
  sellerId: string;
  reason: string;
  createdAt: string;
  liftedAt: string | null;
};

export type JobRunView = {
  id: string;
  jobName: string;
  status: JobRunStatus;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  correlationId: string | null;
};

export type AdminSystemView = {
  api: "ok";
  database: "ready" | "not_ready";
  flags: {
    enableRealPayments: boolean;
    enablePayouts: boolean;
    disableCheckout: boolean;
    disableNewListings: boolean;
    disablePayouts: boolean;
    disableRefundsAutomation: boolean;
    jobsEnabled: boolean;
    refundRetryJobEnabled: boolean;
  };
  lastReconciliation: { id: string; status: string; finishedAt: string | null } | null;
  lastJobs: JobRunView[];
  alerts: AdminAlertView[];
};

export type FeedbackView = {
  id: string;
  userId: string | null;
  category: FeedbackCategory;
  message: string;
  screen: string | null;
  appVersion: string | null;
  requestId: string | null;
  createdAt: string;
};

export type AccountDeletionView = {
  status: "requested";
  deletionRequestedAt: string;
};

export type CollectionView = {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CollectionItemView = {
  id: string;
  collectionId: string;
  variantId: string;
  condition: CardCondition;
  quantity: number;
  purchasePriceClp: number | null;
  purchasedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  estimatedUnitClp: number | null;
  estimatedValueClp: number | null;
  registeredCostClp: number | null;
  estimatedPlClp: number | null;
  variant: VariantView & { card: CardSummaryView };
};

export type CollectionSummaryView = {
  collectionId: string;
  totalCards: number;
  uniqueCards: number;
  estimatedValueClp: number | null;
  itemsWithoutEstimate: number;
  registeredCostClp: number | null;
  itemsWithoutCost: number;
  estimatedPlClp: number | null;
  itemsInPl: number;
  duplicateCards: number;
  extraCopies: number;
  change30dClp: number | null;
  disclaimer: string;
};

export type CollectionSetProgressView = {
  setId: string;
  setName: string;
  setSlug: string;
  gameSlug: string;
  gameName: string;
  ownedUnique: number;
  total: number;
  percentage: number;
  missing: number;
  extraCopies: number;
  missingWithActiveListings: number;
};

export type CollectionMissingCardView = {
  cardId: string;
  name: string;
  number: string;
  slug: string;
  imageUrl: string | null;
  gameSlug: string;
  setSlug: string;
  hasActiveListing: boolean;
};

export type CollectionSetDetailView = {
  progress: CollectionSetProgressView;
  missing: Paginated<CollectionMissingCardView>;
  disclaimer: string;
};

export type SellerPlanView = {
  policyVersion: string;
  plan: string;
  monthlyPriceClp: number;
  source: string | null;
  startsAt: string | null;
  endsAt: string | null;
  normalFeeBps: number;
  normalFeeCapClp: number;
  promotion: {
    active: boolean;
    code: string | null;
    endsAt: string | null;
    effectiveFeeBps: number;
    effectiveFeeCapClp: number;
  };
  billing: {
    automaticCollection: false;
    message: string;
  };
};

export type FeePreviewView = {
  plan: string;
  promotionCode: string | null;
  amountClp: number;
  feeClp: number;
  payableBeforeProcessorClp: number;
  normalFeeBps: number;
  effectiveFeeBps: number;
};

export type AdminSellerPlanView = SellerPlanView & {
  sellerId: string;
  notice: string;
};

export type CatalogSubmissionView = {
  id: string;
  status: CatalogSubmissionStatus;
  name: string;
  number: string | null;
  rarity: string | null;
  game: { id: string; slug: string; name: string };
  set: { id: string; slug: string; name: string } | null;
  proposedSetName: string | null;
  createdAt: string;
  reviewedAt: string | null;
  approvedCardId: string | null;
};

export type CatalogSubmissionDetailView = CatalogSubmissionView & {
  supertype: string | null;
  attributes: Record<string, unknown>;
  imageUrl: string | null;
  notes: string | null;
  sourceUrl: string | null;
  reviewNotes: string | null;
  approvedCard: { id: string; slug: string; name: string; gameSlug: string; setSlug: string } | null;
};

export type CreateCatalogSubmissionResult = {
  id: string;
  status: "PENDING";
};

export type CatalogDuplicateHint = {
  id: string;
  name: string;
  number: string;
  setName: string;
  setSlug: string;
};

export type AdminCatalogSubmissionView = CatalogSubmissionDetailView & {
  submittedBy: { id: string; displayName: string; slug: string };
  reviewedBy: { id: string; displayName: string; slug: string } | null;
  possibleDuplicates: CatalogDuplicateHint[];
};

export type BulkListingPreviewRow = {
  line: number;
  status: "matched" | "missing" | "error";
  game: string;
  set: string;
  cardNumber: string;
  name: string;
  variantId: string | null;
  message: string | null;
};

export type BulkListingPreviewView = {
  total: number;
  matched: number;
  missing: number;
  errors: number;
  rows: BulkListingPreviewRow[];
  notice: string;
};
