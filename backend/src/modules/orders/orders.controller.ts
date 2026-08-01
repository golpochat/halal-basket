import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CurrentUser,
  JwtPayloadUser,
} from '../../common/decorators/current-user.decorator';

@Controller()
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post('orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.customer)
  create(@CurrentUser() user: JwtPayloadUser, @Body() dto: CreateOrderDto) {
    return this.orders.create(user.userId, dto);
  }

  @Post('orders/route-preview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.customer)
  previewRoute(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: CreateOrderDto,
  ) {
    return this.orders.previewRoute(user.userId, dto);
  }

  @Post('orders/stock-hold')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.customer)
  createStockHold(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: CreateOrderDto,
  ) {
    return this.orders.createStockHold(user.userId, dto);
  }

  @Get('orders/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.customer, UserRole.admin, UserRole.super_admin)
  getOne(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.orders.getByIdForUser(id, user.userId, user.role);
  }

  @Get('orders/:id/live')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.customer, UserRole.admin, UserRole.super_admin)
  live(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.orders.getStatusSnapshot(id, user.userId, user.role);
  }

  @Get('customers/me/orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.customer)
  listMine(@CurrentUser() user: JwtPayloadUser) {
    return this.orders.listMine(user.userId);
  }
}
