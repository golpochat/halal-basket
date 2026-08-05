import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { MapsModule } from './modules/maps/maps.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProductsModule } from './modules/products/products.module';
import { ShopsModule } from './modules/shops/shops.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthModule } from './modules/health/health.module';
import { DeliveryCalendarModule } from './modules/delivery-calendar/delivery-calendar.module';
import { RoutingEngineModule } from './modules/routing-engine/routing-engine.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ShopPortalModule } from './modules/shop-portal/shop-portal.module';
import { DriverModule } from './modules/driver/driver.module';
import { RiskEngineModule } from './modules/risk-engine/risk-engine.module';
import { StockPredictionModule } from './modules/stock-prediction/stock-prediction.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PlatformLocaleModule } from './modules/platform-locale/platform-locale.module';
import { FeaturedCategoriesModule } from './modules/featured-categories/featured-categories.module';
import { LegalModule } from './modules/legal/legal.module';
import { FavouritesModule } from './modules/favourites/favourites.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { HttpLoggingInterceptor } from './common/http-logging.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.THROTTLE_TTL_MS ?? 60_000),
        limit: Number(process.env.THROTTLE_LIMIT ?? 120),
      },
    ]),
    CommonModule,
    MapsModule,
    PrismaModule,
    AuthModule,
    ProductsModule,
    ShopsModule,
    AdminModule,
    HealthModule,
    DeliveryCalendarModule,
    RoutingEngineModule,
    OrdersModule,
    ShopPortalModule,
    DriverModule,
    RiskEngineModule,
    StockPredictionModule,
    PaymentsModule,
    PlatformLocaleModule,
    FeaturedCategoriesModule,
    LegalModule,
    FavouritesModule,
    RbacModule,
    WhatsappModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: HttpLoggingInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
