import { Module } from '@nestjs/common';
import { RoutingEngineService } from './routing-engine.service';
import { DeliveryCalendarModule } from '../delivery-calendar/delivery-calendar.module';
import { StockModule } from '../stock/stock.module';

@Module({
  imports: [DeliveryCalendarModule, StockModule],
  providers: [RoutingEngineService],
  exports: [RoutingEngineService],
})
export class RoutingEngineModule {}
