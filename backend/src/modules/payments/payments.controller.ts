import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { IsString } from 'class-validator';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CurrentUser,
  JwtPayloadUser,
} from '../../common/decorators/current-user.decorator';

class ConfirmMockDto {
  @IsString()
  paymentIntentId!: string;
}

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  /** Public: which provider the client should use. */
  @Get('config')
  config() {
    return this.payments.getPublicConfig();
  }

  @Post('orders/:orderId/intent')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.customer, UserRole.admin, UserRole.super_admin)
  createIntent(
    @CurrentUser() user: JwtPayloadUser,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.payments.createIntent(orderId, user.userId);
  }

  @Post('orders/:orderId/confirm-mock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.customer, UserRole.admin, UserRole.super_admin)
  confirmMock(
    @CurrentUser() user: JwtPayloadUser,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: ConfirmMockDto,
  ) {
    return this.payments.confirmMock(orderId, user.userId, dto.paymentIntentId);
  }

  @Post('webhook/stripe')
  stripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string | undefined,
  ) {
    const raw = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));
    return this.payments.handleStripeWebhook(raw, signature);
  }
}
