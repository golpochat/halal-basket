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
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { DeliveryCalendarService } from './delivery-calendar.service';
import {
  CreateCalendarEntryDto,
  SetCalendarActiveDto,
  UpdateCalendarEntryDto,
} from './dto/delivery-calendar.dto';

const OPS = [UserRole.admin, UserRole.super_admin] as const;

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
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(...OPS)
  @RequirePermissions('locations.read')
  listAdmin() {
    return this.calendar.listAdmin();
  }

  @Post('admin/delivery-calendar')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(...OPS)
  @RequirePermissions('locations.write')
  create(@Body() dto: CreateCalendarEntryDto) {
    return this.calendar.create(dto);
  }

  @Patch('admin/delivery-calendar/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(...OPS)
  @RequirePermissions('locations.write')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCalendarEntryDto,
  ) {
    return this.calendar.update(id, dto);
  }

  @Patch('admin/delivery-calendar/:id/active')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(...OPS)
  @RequirePermissions('locations.write')
  setActive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetCalendarActiveDto,
  ) {
    return this.calendar.setActive(id, dto.isActive);
  }

  @Delete('admin/delivery-calendar/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(...OPS)
  @RequirePermissions('locations.write')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.calendar.remove(id);
  }
}
