import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import {
  DevCommerceOrderDto,
  DevInboundDto,
  ReplyThreadDto,
} from './dto/whatsapp.dto';
import { WhatsappCommerceService } from './whatsapp-commerce.service';
import { WhatsappInboxService } from './whatsapp-inbox.service';

const OPS = [UserRole.admin, UserRole.super_admin] as const;
const STAFF_GUARDS = [JwtAuthGuard, RolesGuard, PermissionsGuard] as const;

@Controller()
export class WhatsappController {
  constructor(
    private readonly inbox: WhatsappInboxService,
    private readonly commerce: WhatsappCommerceService,
  ) {}

  /** Meta webhook verification (subscribe challenge). */
  @Get('whatsapp/webhook')
  verifyWebhook(
    @Query('hub.mode') mode: string | undefined,
    @Query('hub.verify_token') token: string | undefined,
    @Query('hub.challenge') challenge: string | undefined,
    @Res() res: Response,
  ) {
    const verified = this.inbox.verifyWebhook(mode, token, challenge);
    if (verified == null) {
      return res.status(403).send('Forbidden');
    }
    return res.status(200).send(verified);
  }

  /** Meta inbound messages. Always 200 so Meta does not retry forever. */
  @Post('whatsapp/webhook')
  async receiveWebhook(@Body() body: unknown) {
    await this.inbox.handleMetaWebhook(
      (body ?? {}) as Parameters<WhatsappInboxService['handleMetaWebhook']>[0],
    );
    return { ok: true };
  }

  /** Redeem assist deep-link token (public). */
  @Get('whatsapp/assist/:token')
  redeemAssist(@Param('token') token: string) {
    return this.inbox.redeemAssistToken(token);
  }

  /**
   * Local simulator when Meta credentials are unset (or non-production).
   * Requires staff auth + whatsapp.reply.
   */
  @Post('whatsapp/dev/inbound')
  @UseGuards(...STAFF_GUARDS)
  @Roles(...OPS)
  @RequirePermissions('whatsapp.reply')
  async devInbound(@Body() dto: DevInboundDto) {
    const allow =
      !this.inbox.metaConfigured() ||
      process.env.NODE_ENV !== 'production';
    if (!allow) {
      throw new ForbiddenException(
        'Dev inbound disabled while Meta is configured in production',
      );
    }
    return this.inbox.ingestInbound({
      phoneE164: dto.phone,
      body: dto.body,
      providerMessageId: dto.providerMessageId ?? null,
    });
  }

  /** Local commerce cart submit (same path as Meta order webhook). */
  @Post('whatsapp/dev/order')
  @UseGuards(...STAFF_GUARDS)
  @Roles(...OPS)
  @RequirePermissions('whatsapp.reply')
  async devOrder(@Body() dto: DevCommerceOrderDto) {
    const allow =
      !this.inbox.metaConfigured() ||
      process.env.NODE_ENV !== 'production';
    if (!allow) {
      throw new ForbiddenException(
        'Dev order disabled while Meta is configured in production',
      );
    }
    return this.commerce.handleCommerceCart({
      phoneE164: dto.phone,
      items: dto.items,
      catalogId: dto.catalogId ?? null,
    });
  }

  @Get('admin/whatsapp/threads')
  @UseGuards(...STAFF_GUARDS)
  @Roles(...OPS)
  @RequirePermissions('whatsapp.read')
  listThreads(
    @Query('status') status?: 'open' | 'closed',
    @Query('needsAssistance') needsAssistance?: string,
  ) {
    return this.inbox.listThreads({
      status: status === 'open' || status === 'closed' ? status : undefined,
      needsAssistance:
        needsAssistance === '1' || needsAssistance === 'true'
          ? true
          : undefined,
    });
  }

  @Get('admin/whatsapp/threads/:id')
  @UseGuards(...STAFF_GUARDS)
  @Roles(...OPS)
  @RequirePermissions('whatsapp.read')
  getThread(@Param('id', ParseUUIDPipe) id: string) {
    return this.inbox.getThread(id);
  }

  @Post('admin/whatsapp/threads/:id/reply')
  @UseGuards(...STAFF_GUARDS)
  @Roles(...OPS)
  @RequirePermissions('whatsapp.reply')
  reply(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplyThreadDto,
  ) {
    return this.inbox.reply(id, dto.body);
  }

  @Post('admin/whatsapp/threads/:id/close')
  @UseGuards(...STAFF_GUARDS)
  @Roles(...OPS)
  @RequirePermissions('whatsapp.reply')
  close(@Param('id', ParseUUIDPipe) id: string) {
    return this.inbox.closeThread(id);
  }

  @Post('admin/whatsapp/threads/:id/assist-link')
  @UseGuards(...STAFF_GUARDS)
  @Roles(...OPS)
  @RequirePermissions('whatsapp.reply')
  createAssistLink(@Param('id', ParseUUIDPipe) id: string) {
    return this.inbox.createAssistLink(id);
  }

  @Post('admin/whatsapp/threads/:id/send-assist-link')
  @UseGuards(...STAFF_GUARDS)
  @Roles(...OPS)
  @RequirePermissions('whatsapp.reply')
  sendAssistLink(@Param('id', ParseUUIDPipe) id: string) {
    return this.inbox.sendAssistLink(id);
  }

  @Post('admin/whatsapp/threads/:id/send-shop-link')
  @UseGuards(...STAFF_GUARDS)
  @Roles(...OPS)
  @RequirePermissions('whatsapp.reply')
  sendShopLink(@Param('id', ParseUUIDPipe) id: string) {
    return this.inbox.sendShopLink(id);
  }

  @Post('admin/whatsapp/threads/:id/send-catalog')
  @UseGuards(...STAFF_GUARDS)
  @Roles(...OPS)
  @RequirePermissions('whatsapp.reply')
  sendCatalog(@Param('id', ParseUUIDPipe) id: string) {
    return this.commerce.sendCatalogForThread(id);
  }

  @Get('admin/whatsapp/catalog/products')
  @UseGuards(...STAFF_GUARDS)
  @Roles(...OPS)
  @RequirePermissions('whatsapp.read')
  listCatalogProducts() {
    return this.commerce.listCatalogCandidates();
  }

  @Post('admin/whatsapp/catalog/sync')
  @UseGuards(...STAFF_GUARDS)
  @Roles(...OPS)
  @RequirePermissions('whatsapp.reply')
  syncCatalog() {
    return this.commerce.syncCatalog();
  }
}
