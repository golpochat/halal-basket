import { Module } from '@nestjs/common';
import { DeliveryCalendarService } from './delivery-calendar.service';
import { DeliveryCalendarController } from './delivery-calendar.controller';

@Module({
  controllers: [DeliveryCalendarController],
  providers: [DeliveryCalendarService],
  exports: [DeliveryCalendarService],
})
export class DeliveryCalendarModule {}
