import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { RoutingEngineModule } from '../routing-engine/routing-engine.module';
import { PlatformLocaleModule } from '../platform-locale/platform-locale.module';
import { StockModule } from '../stock/stock.module';

@Module({
  imports: [RoutingEngineModule, PlatformLocaleModule, StockModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
