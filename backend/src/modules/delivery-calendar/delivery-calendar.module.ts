import { Module } from '@nestjs/common';
import { DeliveryCalendarService } from './delivery-calendar.service';
import { DeliveryCalendarController } from './delivery-calendar.controller';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [RbacModule],
  controllers: [DeliveryCalendarController],
  providers: [DeliveryCalendarService],
  exports: [DeliveryCalendarService],
})
export class DeliveryCalendarModule {}
