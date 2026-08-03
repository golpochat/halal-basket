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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import { memoryStorage } from 'multer';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import {
  CurrentUser,
  type JwtPayloadUser,
} from '../../common/decorators/current-user.decorator';
import {
  CreateBrandingItemDto,
  CreateCurrencyDto,
  CreateLanguageDto,
  CreateWarehouseDto,
  PublishDto,
  PublishWarehouseDto,
  SetActiveBrandingDto,
  SetWarehouseActiveDto,
  UpdateBrandingItemDto,
  UpdateCurrencyDto,
  UpdateDeliveryFeesDto,
  UpdateLanguageDto,
  UpdatePromotionsDto,
  UpdateWarehouseDto,
  UpsertWarehouseDto,
  ValidateCouponDto,
} from './dto/platform-locale.dto';
import { PlatformLocaleService } from './platform-locale.service';

const OPS = [UserRole.admin, UserRole.super_admin] as const;
const STAFF_GUARDS = [JwtAuthGuard, RolesGuard, PermissionsGuard] as const;

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
  @UseGuards(OptionalJwtAuthGuard)
  validateCoupon(
    @Body() dto: ValidateCouponDto,
    @CurrentUser() user?: JwtPayloadUser | null,
  ) {
    return this.locale.validateCoupon(dto, { userId: user?.userId });
  }

  @Get('admin/platform/branding')
  @UseGuards(...STAFF_GUARDS)
  @Roles(...OPS)
  @RequirePermissions('branding.read')
  getBrandingAdmin() {
    return this.locale.getBrandingAdmin();
  }

  @Post('admin/platform/branding/items')
  @UseGuards(...STAFF_GUARDS)
  @Roles(...OPS)
  @RequirePermissions('branding.write')
  createBrandingItem(@Body() dto: CreateBrandingItemDto) {
    return this.locale.createBrandingItem(dto);
  }

  @Patch('admin/platform/branding/items/:id')
  @UseGuards(...STAFF_GUARDS)
  @Roles(...OPS)
  @RequirePermissions('branding.write')
  updateBrandingItem(
    @Param('id') id: string,
    @Body() dto: UpdateBrandingItemDto,
  ) {
    return this.locale.updateBrandingItem(id, dto);
  }

  @Delete('admin/platform/branding/items/:id')
  @UseGuards(...STAFF_GUARDS)
  @Roles(...OPS)
  @RequirePermissions('branding.write')
  deleteBrandingItem(@Param('id') id: string) {
    return this.locale.deleteBrandingItem(id);
  }

  @Patch('admin/platform/branding/active')
  @UseGuards(...STAFF_GUARDS)
  @Roles(...OPS)
  @RequirePermissions('branding.write')
  setActiveBranding(@Body() dto: SetActiveBrandingDto) {
    return this.locale.setActiveBranding(dto.activeId);
  }

  @Post('admin/platform/branding/upload')
  @UseGuards(...STAFF_GUARDS)
  @Roles(...OPS)
  @RequirePermissions('branding.write')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 2_000_000 },
    }),
  )
  uploadBranding(@UploadedFile() file: Express.Multer.File | undefined) {
    return this.locale.uploadHeroBackground(file);
  }

  @Get('admin/platform/delivery-fees')
  @UseGuards(...STAFF_GUARDS)
  @Roles(...OPS)
  @RequirePermissions('locations.read')
  getDeliveryFees() {
    return this.locale.getDeliveryFees();
  }

  @Put('admin/platform/delivery-fees')
  @UseGuards(...STAFF_GUARDS)
  @Roles(...OPS)
  @RequirePermissions('locations.write')
  setDeliveryFees(@Body() dto: UpdateDeliveryFeesDto) {
    return this.locale.setDeliveryFees(dto);
  }

  @Get('admin/platform/promotions')
  @UseGuards(...STAFF_GUARDS)
  @Roles(...OPS)
  @RequirePermissions('promotions.read')
  getPromotionsAdmin() {
    return this.locale.getPromotionsAdmin();
  }

  @Put('admin/platform/promotions')
  @UseGuards(...STAFF_GUARDS)
  @Roles(...OPS)
  @RequirePermissions('promotions.write')
  setPromotions(@Body() dto: UpdatePromotionsDto) {
    return this.locale.setPromotions(dto);
  }

  @Get('admin/platform/warehouses')
  @UseGuards(...STAFF_GUARDS)
  @Roles(...OPS)
  @RequirePermissions('warehouses.read')
  listWarehouses() {
    return this.locale.listWarehousesAdmin();
  }

  @Post('admin/platform/warehouses')
  @UseGuards(...STAFF_GUARDS)
  @Roles(...OPS)
  @RequirePermissions('warehouses.write')
  createWarehouse(@Body() dto: CreateWarehouseDto) {
    return this.locale.createWarehouse(dto);
  }

  @Patch('admin/platform/warehouses/:id')
  @UseGuards(...STAFF_GUARDS)
  @Roles(...OPS)
  @RequirePermissions('warehouses.write')
  updateWarehouse(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWarehouseDto,
  ) {
    return this.locale.updateWarehouse(id, dto);
  }

  @Delete('admin/platform/warehouses/:id')
  @UseGuards(...STAFF_GUARDS)
  @Roles(...OPS)
  @RequirePermissions('warehouses.write')
  deleteWarehouse(@Param('id', ParseUUIDPipe) id: string) {
    return this.locale.deleteWarehouse(id);
  }

  @Put('admin/platform/warehouses/:id/publish')
  @UseGuards(...STAFF_GUARDS)
  @Roles(...OPS)
  @RequirePermissions('warehouses.write')
  publishWarehouseById(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PublishWarehouseDto,
  ) {
    return this.locale.setWarehousePublished(id, dto);
  }

  @Put('admin/platform/warehouses/:id/active')
  @UseGuards(...STAFF_GUARDS)
  @Roles(...OPS)
  @RequirePermissions('warehouses.write')
  setWarehouseActive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetWarehouseActiveDto,
  ) {
    return this.locale.setWarehouseActive(id, dto.isActive);
  }

  /** @deprecated Prefer /admin/platform/warehouses */
  @Get('admin/platform/warehouse')
  @UseGuards(...STAFF_GUARDS)
  @Roles(...OPS)
  @RequirePermissions('warehouses.read')
  getWarehouse() {
    return this.locale.getWarehouseAdmin();
  }

  /** @deprecated Prefer /admin/platform/warehouses */
  @Put('admin/platform/warehouse')
  @UseGuards(...STAFF_GUARDS)
  @Roles(...OPS)
  @RequirePermissions('warehouses.write')
  upsertWarehouse(@Body() dto: UpsertWarehouseDto) {
    return this.locale.upsertWarehouse(dto);
  }

  /** @deprecated Prefer /admin/platform/warehouses/:id/publish */
  @Put('admin/platform/warehouse/publish')
  @UseGuards(...STAFF_GUARDS)
  @Roles(...OPS)
  @RequirePermissions('warehouses.write')
  async publishWarehouse(@Body() dto: PublishWarehouseDto) {
    const list = await this.locale.listWarehousesAdmin();
    const first = list[0];
    if (!first) {
      return list;
    }
    return this.locale.setWarehousePublished(first.id, dto);
  }

  @Get('admin/currencies')
  @UseGuards(...STAFF_GUARDS)
  @Roles(...OPS)
  @RequirePermissions('currencies.read')
  listCurrencies() {
    return this.locale.listCurrencies();
  }

  @Post('admin/currencies')
  @UseGuards(...STAFF_GUARDS)
  @Roles(...OPS)
  @RequirePermissions('currencies.write')
  createCurrency(@Body() dto: CreateCurrencyDto) {
    return this.locale.createCurrency(dto);
  }

  @Patch('admin/currencies/:id')
  @UseGuards(...STAFF_GUARDS)
  @Roles(...OPS)
  @RequirePermissions('currencies.write')
  updateCurrency(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCurrencyDto,
  ) {
    return this.locale.updateCurrency(id, dto);
  }

  @Patch('admin/currencies/:id/publish')
  @UseGuards(...STAFF_GUARDS)
  @Roles(...OPS)
  @RequirePermissions('currencies.write')
  publishCurrency(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PublishDto,
  ) {
    return this.locale.setCurrencyPublished(id, dto.isPublished);
  }

  @Post('admin/currencies/:id/set-default')
  @UseGuards(...STAFF_GUARDS)
  @Roles(...OPS)
  @RequirePermissions('currencies.write')
  setDefaultCurrency(@Param('id', ParseUUIDPipe) id: string) {
    return this.locale.setDefaultCurrency(id);
  }

  @Delete('admin/currencies/:id')
  @UseGuards(...STAFF_GUARDS)
  @Roles(...OPS)
  @RequirePermissions('currencies.write')
  deleteCurrency(@Param('id', ParseUUIDPipe) id: string) {
    return this.locale.deleteCurrency(id);
  }

  @Get('admin/languages')
  @UseGuards(...STAFF_GUARDS)
  @Roles(...OPS)
  @RequirePermissions('languages.read')
  listLanguages() {
    return this.locale.listLanguages();
  }

  @Post('admin/languages')
  @UseGuards(...STAFF_GUARDS)
  @Roles(...OPS)
  @RequirePermissions('languages.write')
  createLanguage(@Body() dto: CreateLanguageDto) {
    return this.locale.createLanguage(dto);
  }

  @Patch('admin/languages/:id')
  @UseGuards(...STAFF_GUARDS)
  @Roles(...OPS)
  @RequirePermissions('languages.write')
  updateLanguage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLanguageDto,
  ) {
    return this.locale.updateLanguage(id, dto);
  }

  @Patch('admin/languages/:id/publish')
  @UseGuards(...STAFF_GUARDS)
  @Roles(...OPS)
  @RequirePermissions('languages.write')
  publishLanguage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PublishDto,
  ) {
    return this.locale.setLanguagePublished(id, dto.isPublished);
  }

  @Post('admin/languages/:id/set-default')
  @UseGuards(...STAFF_GUARDS)
  @Roles(...OPS)
  @RequirePermissions('languages.write')
  setDefaultLanguage(@Param('id', ParseUUIDPipe) id: string) {
    return this.locale.setDefaultLanguage(id);
  }

  @Delete('admin/languages/:id')
  @UseGuards(...STAFF_GUARDS)
  @Roles(...OPS)
  @RequirePermissions('languages.write')
  deleteLanguage(@Param('id', ParseUUIDPipe) id: string) {
    return this.locale.deleteLanguage(id);
  }
}
