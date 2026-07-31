import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
  UpdateCurrencyDto,
  UpdateLanguageDto,
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

  @Patch('admin/platform/branding')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...PLATFORM)
  setBranding(@Body() body: { heroBackgroundUrl?: string }) {
    return this.locale.setBranding(body.heroBackgroundUrl ?? '');
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
