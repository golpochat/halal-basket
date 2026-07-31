import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Weekday } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  nextDateForWeekday,
  startOfUtcDay,
  WeekdayName,
} from './calendar-math';

@Injectable()
export class DeliveryCalendarService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.deliveryCalendar.findMany({
      where: { isActive: true },
      orderBy: [{ areaName: 'asc' }, { deliveryDay: 'asc' }],
    });
  }

  async resolveNextDeliveryDate(
    areaName: string,
    from: Date = new Date(),
  ): Promise<{ deliveryDate: Date; deliveryDay: Weekday }> {
    const area = areaName.trim();
    if (!area) {
      throw new BadRequestException('delivery_area_name is required');
    }

    const rows = await this.prisma.deliveryCalendar.findMany({
      where: { areaName: area, isActive: true },
    });
    if (rows.length === 0) {
      throw new BadRequestException(
        `No delivery calendar configured for area "${area}"`,
      );
    }

    const start = startOfUtcDay(from);
    let best: { deliveryDate: Date; deliveryDay: Weekday } | null = null;

    for (const row of rows) {
      const candidate = nextDateForWeekday(
        start,
        row.deliveryDay as WeekdayName,
      );
      if (!best || candidate.getTime() < best.deliveryDate.getTime()) {
        best = { deliveryDate: candidate, deliveryDay: row.deliveryDay };
      }
    }

    if (!best) {
      throw new NotFoundException('Could not resolve delivery date');
    }
    return best;
  }
}
