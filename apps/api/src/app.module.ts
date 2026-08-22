import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { HttpErrorFilter } from "./common/filters/http-error.filter";
import { AuthModule } from "./auth/auth.module";
import { AuditModule } from "./audit/audit.module";
import { HealthModule } from "./health/health.module";
import { MailModule } from "./mail/mail.module";
import { PlatformConfigModule } from "./platform-config/platform-config.module";
import { PrismaModule } from "./prisma/prisma.module";
import { UsersModule } from "./users/users.module";
import { CatalogModule } from "./catalog/catalog.module";
import { SearchModule } from "./search/search.module";
import { ListingsModule } from "./listings/listings.module";
import { CartModule } from "./cart/cart.module";
import { FilesModule } from "./files/files.module";
import { OrdersModule } from "./orders/orders.module";
import { PaymentsModule } from "./payments/payments.module";
import { ShippingModule } from "./shipping/shipping.module";
import { RatingsModule } from "./ratings/ratings.module";
import { AdminModule } from "./admin/admin.module";
import { LedgerModule } from "./ledger/ledger.module";
import { PayoutsModule } from "./payouts/payouts.module";
import { ReconciliationModule } from "./reconciliation/reconciliation.module";
import { TrustModule } from "./trust/trust.module";
import { FlagsModule } from "./flags/flags.module";
import { ObservabilityModule } from "./observability/observability.module";
import { JobsModule } from "./jobs/jobs.module";
import { FeedbackModule } from "./feedback/feedback.module";
import { CollectionsModule } from "./collections/collections.module";
import { WishlistModule } from "./wishlist/wishlist.module";
import { NotificationsModule } from "./notifications/notifications.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env"],
    }),
    PrismaModule,
    AuditModule,
    MailModule,
    AuthModule,
    UsersModule,
    CatalogModule,
    SearchModule,
    ListingsModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    ShippingModule,
    RatingsModule,
    AdminModule,
    LedgerModule,
    PayoutsModule,
    ReconciliationModule,
    TrustModule,
    FilesModule,
    PlatformConfigModule,
    HealthModule,
    FlagsModule,
    ObservabilityModule,
    JobsModule,
    FeedbackModule,
    CollectionsModule,
    WishlistModule,
    NotificationsModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: HttpErrorFilter }],
})
export class AppModule {}
