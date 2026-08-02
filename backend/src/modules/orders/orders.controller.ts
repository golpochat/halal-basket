import {
  Controller,
  Get,
  MessageEvent,
  Param,
  ParseUUIDPipe,
  Post,
  Sse,
  UseGuards,
  Body,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { Observable, interval, merge, from } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { OrdersService } from './orders.service';
import { OrderLiveHub } from './order-live.hub';
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
  constructor(
    private readonly orders: OrdersService,
    private readonly liveHub: OrderLiveHub,
  ) {}

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
  @Roles(
    UserRole.customer,
    UserRole.driver,
    UserRole.shop,
    UserRole.admin,
    UserRole.super_admin,
  )
  live(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.orders.getStatusSnapshot(id, user.userId, user.role);
  }

  /**
   * Server-Sent Events stream — pushes a status snapshot on connect and
   * whenever driver/shop updates the order. Heartbeat keeps proxies alive.
   */
  @Sse('orders/:id/live/stream')
  @SkipThrottle()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.customer,
    UserRole.driver,
    UserRole.shop,
    UserRole.admin,
    UserRole.super_admin,
  )
  liveStream(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Observable<MessageEvent> {
    return from(
      this.orders.assertCanWatchLive(id, user.userId, user.role),
    ).pipe(
      switchMap(() => {
        const initial$ = from(
          this.orders.getStatusSnapshot(id, user.userId, user.role),
        ).pipe(
          map(
            (snapshot) =>
              ({
                type: 'status',
                data: snapshot,
              }) as MessageEvent,
          ),
        );

        const updates$ = this.liveHub.watch(id).pipe(
          map(
            (snapshot) =>
              ({
                type: 'status',
                data: snapshot,
              }) as MessageEvent,
          ),
        );

        const heartbeat$ = interval(15_000).pipe(
          map(
            () =>
              ({
                type: 'ping',
                data: { ok: true, at: new Date().toISOString() },
              }) as MessageEvent,
          ),
        );

        return merge(initial$, updates$, heartbeat$);
      }),
    );
  }

  @Get('customers/me/orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.customer)
  listMine(@CurrentUser() user: JwtPayloadUser) {
    return this.orders.listMine(user.userId);
  }
}
