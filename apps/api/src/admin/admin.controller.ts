import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ADMIN_OPS_ROLES } from "@tcg/config";
import {
  adminCancelOrderSchema,
  adminLedgerAdjustmentSchema,
  adminLedgerQuerySchema,
  adminListingsQuerySchema,
  adminMarkPayoutPaidSchema,
  adminOrdersQuerySchema,
  adminPaymentsQuerySchema,
  adminPayoutFailSchema,
  adminPayoutReasonSchema,
  adminPayoutsQuerySchema,
  adminRefundsQuerySchema,
  adminRetryRefundSchema,
  adminUsersQuerySchema,
  createAdminPayoutSchema,
  paginationQuerySchema,
  uuidParamSchema,
  type AdminCancelOrderInput,
  type AdminLedgerAdjustmentInput,
  type AdminLedgerQuery,
  type AdminListingsQuery,
  type AdminMarkPayoutPaidInput,
  type AdminOrdersQuery,
  type AdminPaymentsQuery,
  type AdminPayoutFailInput,
  type AdminPayoutReasonInput,
  type AdminPayoutsQuery,
  type AdminRefundsQuery,
  type AdminUsersQuery,
  type CreateAdminPayoutInput,
  type PaginationQuery,
} from "@tcg/validation";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodPipe } from "../common/pipes/zod-pipe";
import type { RequestUser } from "../auth/request-user";
import { AdminActionsService } from "./admin-actions.service";
import { AdminOpsService } from "./admin-ops.service";
import { LedgerAdjustmentService } from "../ledger/ledger-adjustment.service";
import { LedgerQueryService } from "../ledger/ledger-query.service";
import { SellerBalanceService } from "../ledger/seller-balance.service";
import { PayoutsService } from "../payouts/payouts.service";
import { MetricsService } from "../observability/metrics.service";

@Controller("v1/admin")
@Roles(...ADMIN_OPS_ROLES)
export class AdminController {
  constructor(
    private readonly ops: AdminOpsService,
    private readonly actions: AdminActionsService,
    private readonly payouts: PayoutsService,
    private readonly balances: SellerBalanceService,
    private readonly ledgerQuery: LedgerQueryService,
    private readonly adjustments: LedgerAdjustmentService,
    private readonly metrics: MetricsService,
  ) {}

  @Get("dashboard")
  dashboard() {
    return this.ops.dashboard();
  }

  @Get("system")
  system() {
    return this.ops.system();
  }

  @Get("jobs")
  jobs(@Query(new ZodPipe(paginationQuerySchema)) query: PaginationQuery) {
    return this.ops.listJobs(query.page, query.pageSize);
  }

  @Get("jobs/:id")
  job(@Param("id", new ZodPipe(uuidParamSchema)) id: string) {
    return this.ops.getJob(id);
  }

  @Get("metrics")
  metricsSnapshot() {
    return this.metrics.snapshot();
  }

  @Get("orders")
  orders(@Query(new ZodPipe(adminOrdersQuerySchema)) query: AdminOrdersQuery) {
    return this.ops.listOrders(query);
  }

  @Get("orders/:id")
  order(@Param("id", new ZodPipe(uuidParamSchema)) id: string) {
    return this.actions.getOrder(id);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post("orders/:id/cancel")
  cancelOrder(
    @CurrentUser() user: RequestUser,
    @Param("id", new ZodPipe(uuidParamSchema)) id: string,
    @Body(new ZodPipe(adminCancelOrderSchema)) body: AdminCancelOrderInput,
  ) {
    return this.actions.cancelOrder(user, id, body);
  }

  @Get("payments")
  payments(@Query(new ZodPipe(adminPaymentsQuerySchema)) query: AdminPaymentsQuery) {
    return this.ops.listPayments(query);
  }

  @Get("payments/:id")
  payment(@Param("id", new ZodPipe(uuidParamSchema)) id: string) {
    return this.actions.getPayment(id);
  }

  @Get("refunds")
  refunds(@Query(new ZodPipe(adminRefundsQuerySchema)) query: AdminRefundsQuery) {
    return this.ops.listRefunds(query);
  }

  @Get("refunds/:id")
  refund(@Param("id", new ZodPipe(uuidParamSchema)) id: string) {
    return this.actions.getRefund(id);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post("refunds/:id/retry")
  retryRefund(
    @CurrentUser() user: RequestUser,
    @Param("id", new ZodPipe(uuidParamSchema)) id: string,
    @Body(new ZodPipe(adminRetryRefundSchema)) _body: Record<string, never>,
  ) {
    return this.actions.retryRefund(user, id);
  }

  @Get("users")
  users(@Query(new ZodPipe(adminUsersQuerySchema)) query: AdminUsersQuery) {
    return this.ops.listUsers(query);
  }

  @Get("listings")
  listings(@Query(new ZodPipe(adminListingsQuerySchema)) query: AdminListingsQuery) {
    return this.ops.listListings(query);
  }

  @Get("payouts")
  listPayouts(@Query(new ZodPipe(adminPayoutsQuerySchema)) query: AdminPayoutsQuery) {
    return this.payouts.list(query);
  }

  @Get("payouts/:id")
  getPayout(@Param("id", new ZodPipe(uuidParamSchema)) id: string) {
    return this.payouts.get(id);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post("payouts")
  createPayout(
    @CurrentUser() user: RequestUser,
    @Body(new ZodPipe(createAdminPayoutSchema)) body: CreateAdminPayoutInput,
  ) {
    return this.payouts.create(user, body);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post("payouts/:id/approve")
  approvePayout(
    @CurrentUser() user: RequestUser,
    @Param("id", new ZodPipe(uuidParamSchema)) id: string,
    @Body(new ZodPipe(adminPayoutReasonSchema)) body: AdminPayoutReasonInput,
  ) {
    return this.payouts.approve(user, id, body);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post("payouts/:id/mark-processing")
  markProcessing(
    @CurrentUser() user: RequestUser,
    @Param("id", new ZodPipe(uuidParamSchema)) id: string,
    @Body(new ZodPipe(adminPayoutReasonSchema)) body: AdminPayoutReasonInput,
  ) {
    return this.payouts.markProcessing(user, id, body);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post("payouts/:id/mark-paid")
  markPaid(
    @CurrentUser() user: RequestUser,
    @Param("id", new ZodPipe(uuidParamSchema)) id: string,
    @Body(new ZodPipe(adminMarkPayoutPaidSchema)) body: AdminMarkPayoutPaidInput,
  ) {
    return this.payouts.markPaid(user, id, body);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post("payouts/:id/fail")
  failPayout(
    @CurrentUser() user: RequestUser,
    @Param("id", new ZodPipe(uuidParamSchema)) id: string,
    @Body(new ZodPipe(adminPayoutFailSchema)) body: AdminPayoutFailInput,
  ) {
    return this.payouts.fail(user, id, body);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post("payouts/:id/cancel")
  cancelPayout(
    @CurrentUser() user: RequestUser,
    @Param("id", new ZodPipe(uuidParamSchema)) id: string,
    @Body(new ZodPipe(adminPayoutReasonSchema)) body: AdminPayoutReasonInput,
  ) {
    return this.payouts.cancel(user, id, body);
  }

  @Get("sellers/:id/balance")
  sellerBalance(@Param("id", new ZodPipe(uuidParamSchema)) id: string) {
    return this.balances.forSeller(id);
  }

  @Get("ledger")
  ledger(@Query(new ZodPipe(adminLedgerQuerySchema)) query: AdminLedgerQuery) {
    return this.ledgerQuery.list(query);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Roles("SUPER_ADMIN")
  @Post("ledger/adjustments")
  adjustLedger(
    @CurrentUser() user: RequestUser,
    @Body(new ZodPipe(adminLedgerAdjustmentSchema)) body: AdminLedgerAdjustmentInput,
  ) {
    return this.adjustments.create(user, body);
  }
}
