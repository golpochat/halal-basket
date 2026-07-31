import { Controller, Get, Query } from '@nestjs/common';
import { DeliveryCalendarService } from './delivery-calendar.service';

@Controller('delivery-calendar')
export class DeliveryCalendarController {
  constructor(private readonly calendar: DeliveryCalendarService) {}

  @Get()
  list() {
    return this.calendar.list();
  }

  @Get('resolve')
  resolve(@Query('area') area: string) {
    return this.calendar.resolveNextDeliveryDate(area);
  }
}
