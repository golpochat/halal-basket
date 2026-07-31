import { Module } from '@nestjs/common';
import { RoutingEngineService } from './routing-engine.service';
import { DeliveryCalendarModule } from '../delivery-calendar/delivery-calendar.module';

@Module({
  imports: [DeliveryCalendarModule],
  providers: [RoutingEngineService],
  exports: [RoutingEngineService],
})
export class RoutingEngineModule {}
