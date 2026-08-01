import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Weekday } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  nextDateForWeekday,
  startOfUtcDay,
  WeekdayName,
} from './calendar-math';
import {
  CreateCalendarEntryDto,
  UpdateCalendarEntryDto,
} from './dto/delivery-calendar.dto';

@Injectable()
export class DeliveryCalendarService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.deliveryCalendar.findMany({
      where: { isActive: true },
      orderBy: [{ areaName: 'asc' }, { deliveryDay: 'asc' }],
    });
  }

  listAdmin() {
    return this.prisma.deliveryCalendar.findMany({
      orderBy: [{ areaName: 'asc' }, { deliveryDay: 'asc' }],
    });
  }

  async create(dto: CreateCalendarEntryDto) {
    const areaName = dto.areaName.trim();
    if (!areaName) {
      throw new BadRequestException('areaName is required');
    }
    try {
      return await this.prisma.deliveryCalendar.create({
        data: {
          areaName,
          deliveryDay: dto.deliveryDay,
          isActive: dto.isActive ?? true,
        },
      });
    } catch (e) {
      this.rethrowUnique(e);
    }
  }

  async update(id: string, dto: UpdateCalendarEntryDto) {
    await this.requireRow(id);
    const data: Prisma.DeliveryCalendarUpdateInput = {};
    if (dto.areaName !== undefined) {
      const areaName = dto.areaName.trim();
      if (!areaName) throw new BadRequestException('areaName is required');
      data.areaName = areaName;
    }
    if (dto.deliveryDay !== undefined) data.deliveryDay = dto.deliveryDay;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    try {
      return await this.prisma.deliveryCalendar.update({
        where: { id },
        data,
      });
    } catch (e) {
      this.rethrowUnique(e);
    }
  }

  async setActive(id: string, isActive: boolean) {
    await this.requireRow(id);
    return this.prisma.deliveryCalendar.update({
      where: { id },
      data: { isActive },
    });
  }

  async remove(id: string) {
    await this.requireRow(id);
    await this.prisma.deliveryCalendar.delete({ where: { id } });
    return { deleted: true };
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

  private async requireRow(id: string) {
    const row = await this.prisma.deliveryCalendar.findUnique({
      where: { id },
    });
    if (!row) throw new NotFoundException('Calendar entry not found');
    return row;
  }

  private rethrowUnique(e: unknown): never {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      throw new BadRequestException(
        'That area already has this delivery day configured',
      );
    }
    throw e;
  }
}
