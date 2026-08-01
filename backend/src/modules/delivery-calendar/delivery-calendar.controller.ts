import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { DeliveryCalendarService } from './delivery-calendar.service';
import {
  CreateCalendarEntryDto,
  SetCalendarActiveDto,
  UpdateCalendarEntryDto,
} from './dto/delivery-calendar.dto';

const PLATFORM = [UserRole.super_admin] as const;

@Controller()
export class DeliveryCalendarController {
  constructor(private readonly calendar: DeliveryCalendarService) {}

  @Get('delivery-calendar')
  list() {
    return this.calendar.list();
  }

  @Get('delivery-calendar/resolve')
  resolve(@Query('area') area: string) {
    return this.calendar.resolveNextDeliveryDate(area);
  }

  @Get('admin/delivery-calendar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...PLATFORM)
  listAdmin() {
    return this.calendar.listAdmin();
  }

  @Post('admin/delivery-calendar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...PLATFORM)
  create(@Body() dto: CreateCalendarEntryDto) {
    return this.calendar.create(dto);
  }

  @Patch('admin/delivery-calendar/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...PLATFORM)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCalendarEntryDto,
  ) {
    return this.calendar.update(id, dto);
  }

  @Patch('admin/delivery-calendar/:id/active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...PLATFORM)
  setActive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetCalendarActiveDto,
  ) {
    return this.calendar.setActive(id, dto.isActive);
  }

  @Delete('admin/delivery-calendar/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...PLATFORM)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.calendar.remove(id);
  }
}
