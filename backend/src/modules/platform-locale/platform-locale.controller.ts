import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  CreateCurrencyDto,
  CreateLanguageDto,
  PublishDto,
  PublishWarehouseDto,
  UpdateCurrencyDto,
  UpdateDeliveryFeesDto,
  UpdateLanguageDto,
  UpdatePromotionsDto,
  UpsertWarehouseDto,
  ValidateCouponDto,
} from './dto/platform-locale.dto';
import { PlatformLocaleService } from './platform-locale.service';

const PLATFORM = [UserRole.super_admin] as const;

@Controller()
export class PlatformLocaleController {
  constructor(private readonly locale: PlatformLocaleService) {}

  /** Public: published options only. Pickers show when length > 1. */
  @Get('platform/locale')
  getPublicLocale() {
    return this.locale.getPublicLocale();
  }

  @Get('platform/branding')
  getBranding() {
    return this.locale.getBranding();
  }

  /** Public: HB delivery fees + active calendar areas. */
  @Get('platform/delivery-config')
  getDeliveryConfig() {
    return this.locale.getPublicDeliveryConfig();
  }

  /** Public: cart promo banner (no coupon list). */
  @Get('platform/promotions')
  getPromotions() {
    return this.locale.getPublicPromotions();
  }

  /** Public: validate a coupon against current cart subtotal. */
  @Post('platform/coupons/validate')
  validateCoupon(@Body() dto: ValidateCouponDto) {
    return this.locale.validateCoupon(dto);
  }

  @Patch('admin/platform/branding')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...PLATFORM)
  setBranding(@Body() body: { heroBackgroundUrl?: string }) {
    return this.locale.setBranding(body.heroBackgroundUrl ?? '');
  }

  @Get('admin/platform/delivery-fees')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...PLATFORM)
  getDeliveryFees() {
    return this.locale.getDeliveryFees();
  }

  @Put('admin/platform/delivery-fees')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...PLATFORM)
  setDeliveryFees(@Body() dto: UpdateDeliveryFeesDto) {
    return this.locale.setDeliveryFees(dto);
  }

  @Get('admin/platform/promotions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...PLATFORM)
  getPromotionsAdmin() {
    return this.locale.getPromotionsAdmin();
  }

  @Put('admin/platform/promotions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...PLATFORM)
  setPromotions(@Body() dto: UpdatePromotionsDto) {
    return this.locale.setPromotions(dto);
  }

  @Get('admin/platform/warehouse')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...PLATFORM)
  getWarehouse() {
    return this.locale.getWarehouseAdmin();
  }

  @Put('admin/platform/warehouse')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...PLATFORM)
  upsertWarehouse(@Body() dto: UpsertWarehouseDto) {
    return this.locale.upsertWarehouse(dto);
  }

  @Put('admin/platform/warehouse/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...PLATFORM)
  publishWarehouse(@Body() dto: PublishWarehouseDto) {
    return this.locale.setWarehousePublished(dto);
  }

  @Get('admin/currencies')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...PLATFORM)
  listCurrencies() {
    return this.locale.listCurrencies();
  }

  @Post('admin/currencies')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...PLATFORM)
  createCurrency(@Body() dto: CreateCurrencyDto) {
    return this.locale.createCurrency(dto);
  }

  @Patch('admin/currencies/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...PLATFORM)
  updateCurrency(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCurrencyDto,
  ) {
    return this.locale.updateCurrency(id, dto);
  }

  @Patch('admin/currencies/:id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...PLATFORM)
  publishCurrency(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PublishDto,
  ) {
    return this.locale.setCurrencyPublished(id, dto.isPublished);
  }

  @Post('admin/currencies/:id/set-default')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...PLATFORM)
  setDefaultCurrency(@Param('id', ParseUUIDPipe) id: string) {
    return this.locale.setDefaultCurrency(id);
  }

  @Delete('admin/currencies/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...PLATFORM)
  deleteCurrency(@Param('id', ParseUUIDPipe) id: string) {
    return this.locale.deleteCurrency(id);
  }

  @Get('admin/languages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...PLATFORM)
  listLanguages() {
    return this.locale.listLanguages();
  }

  @Post('admin/languages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...PLATFORM)
  createLanguage(@Body() dto: CreateLanguageDto) {
    return this.locale.createLanguage(dto);
  }

  @Patch('admin/languages/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...PLATFORM)
  updateLanguage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLanguageDto,
  ) {
    return this.locale.updateLanguage(id, dto);
  }

  @Patch('admin/languages/:id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...PLATFORM)
  publishLanguage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PublishDto,
  ) {
    return this.locale.setLanguagePublished(id, dto.isPublished);
  }

  @Post('admin/languages/:id/set-default')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...PLATFORM)
  setDefaultLanguage(@Param('id', ParseUUIDPipe) id: string) {
    return this.locale.setDefaultLanguage(id);
  }

  @Delete('admin/languages/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...PLATFORM)
  deleteLanguage(@Param('id', ParseUUIDPipe) id: string) {
    return this.locale.deleteLanguage(id);
  }
}
