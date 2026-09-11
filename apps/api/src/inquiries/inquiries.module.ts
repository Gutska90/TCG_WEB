import { Module } from "@nestjs/common";
import { CartModule } from "../cart/cart.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { InquiriesController } from "./inquiries.controller";
import { InquiriesService } from "./inquiries.service";

@Module({
  imports: [CartModule, NotificationsModule],
  controllers: [InquiriesController],
  providers: [InquiriesService],
  exports: [InquiriesService],
})
export class InquiriesModule {}
