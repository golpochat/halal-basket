import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminUsersService } from './admin-users.service';
import { AdminCustomersService } from './admin-customers.service';
import { AdminOrderEventsService } from './admin-order-events.service';
import { AdminAnalyticsService } from './admin-analytics.service';
import { GdprService } from './gdpr.service';
import { ProductsModule } from '../products/products.module';
import { ShopsModule } from '../shops/shops.module';
import { RiskEngineModule } from '../risk-engine/risk-engine.module';

@Module({
  imports: [ProductsModule, ShopsModule, RiskEngineModule],
  controllers: [AdminController],
  providers: [
    AdminUsersService,
    AdminCustomersService,
    AdminOrderEventsService,
    AdminAnalyticsService,
    GdprService,
  ],
})
export class AdminModule {}
