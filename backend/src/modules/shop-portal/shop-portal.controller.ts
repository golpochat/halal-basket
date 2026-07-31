import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ShopPortalService } from './shop-portal.service';
import {
  UpdateFulfillmentStatusDto,
  UpdateShopProductDto,
  AssignDriverDto,
} from './dto/shop-portal.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CurrentUser,
  JwtPayloadUser,
} from '../../common/decorators/current-user.decorator';

@Controller('shop-portal')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.shop)
export class ShopPortalController {
  constructor(private readonly portal: ShopPortalService) {}

  @Get('drivers')
  listDrivers() {
    return this.portal.listDrivers();
  }

  @Get('orders')
  listOrders(
    @CurrentUser() user: JwtPayloadUser,
    @Query('deliveryDate') deliveryDate?: string,
  ) {
    return this.portal.listOrders(user.userId, user.role, deliveryDate);
  }

  @Patch('orders/:fulfillmentId/status')
  updateStatus(
    @CurrentUser() user: JwtPayloadUser,
    @Param('fulfillmentId', ParseUUIDPipe) fulfillmentId: string,
    @Body() dto: UpdateFulfillmentStatusDto,
  ) {
    return this.portal.updateStatus(
      user.userId,
      user.role,
      fulfillmentId,
      dto.status,
    );
  }

  @Patch('orders/:fulfillmentId/assign-driver')
  assignDriver(
    @CurrentUser() user: JwtPayloadUser,
    @Param('fulfillmentId', ParseUUIDPipe) fulfillmentId: string,
    @Body() body: AssignDriverDto,
  ) {
    return this.portal.assignDriver(
      user.userId,
      user.role,
      fulfillmentId,
      body.driverId,
    );
  }

  @Get('products')
  listProducts(@CurrentUser() user: JwtPayloadUser) {
    return this.portal.listProducts(user.userId, user.role);
  }

  @Patch('products/:id')
  updateProduct(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateShopProductDto,
  ) {
    return this.portal.updateProduct(user.userId, user.role, id, dto);
  }
}
