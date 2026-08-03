import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import { Response } from 'express';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import * as XLSX from 'xlsx';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { ProductsService, ProductImportRow } from '../products/products.service';
import { ShopsService } from '../shops/shops.service';
import { AdminUsersService } from './admin-users.service';
import { AdminCustomersService } from './admin-customers.service';
import { AdminOrderEventsService } from './admin-order-events.service';
import { AdminAnalyticsService } from './admin-analytics.service';
import { GdprService } from './gdpr.service';
import { AdminEntityOverviewService } from './admin-entity-overview.service';
import { CreateShopDto, UpsertShopProductDto } from '../shops/dto/shop.dto';
import {
  CreateAdminUserDto,
  SetUserActiveDto,
  UpdateAdminUserDto,
} from './dto/create-user.dto';
import { assertBarcodeRequired } from '../products/import-validation';
import { ComplaintDto, RefundDto } from './dto/admin-events.dto';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import {
  CurrentUser,
  JwtPayloadUser,
} from '../../common/decorators/current-user.decorator';
import { RiskEngineService } from '../risk-engine/risk-engine.service';
import { MetricsService } from '../../common/metrics.service';
import { PrismaService } from '../../prisma/prisma.service';

class BlockCustomerDto {
  @IsBoolean()
  isBlocked!: boolean;
}

class TestAlertDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

const OPS = [UserRole.admin, UserRole.super_admin] as const;
const PLATFORM = [UserRole.super_admin] as const;

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class AdminController {
  constructor(
    private readonly products: ProductsService,
    private readonly shops: ShopsService,
    private readonly users: AdminUsersService,
    private readonly customers: AdminCustomersService,
    private readonly orderEvents: AdminOrderEventsService,
    private readonly analytics: AdminAnalyticsService,
    private readonly risk: RiskEngineService,
    private readonly gdpr: GdprService,
    private readonly overview: AdminEntityOverviewService,
    private readonly metrics: MetricsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('customers')
  @Roles(...OPS)
  @RequirePermissions('ops.read')
  listCustomers() {
    return this.customers.list();
  }

  @Get('customers/:id/privacy')
  @Roles(...OPS)
  @RequirePermissions('gdpr.read')
  customerPrivacySummary(@Param('id', ParseUUIDPipe) id: string) {
    return this.gdpr.privacySummary(id);
  }

  @Get('customers/:id/export')
  @Roles(...OPS)
  @RequirePermissions('gdpr.read')
  exportCustomer(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.gdpr.exportCustomer(id, user.userId);
  }

  @Post('customers/:id/erase')
  @Roles(...OPS)
  @RequirePermissions('gdpr.write')
  eraseCustomer(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.gdpr.eraseCustomer(id, user.userId);
  }

  @Get('metrics')
  @Roles(...PLATFORM)
  @RequirePermissions('ops.write')
  metricsSnapshot() {
    return this.metrics.snapshot();
  }

  @Post('ops/test-alert')
  @Roles(...PLATFORM)
  @RequirePermissions('ops.write')
  testAlert(@Body() dto: TestAlertDto) {
    return this.metrics.fireTestAlert(dto.reason ?? 'manual-drill');
  }

  @Patch('customers/:id/block')
  @Roles(...OPS)
  @RequirePermissions('ops.write')
  blockCustomer(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BlockCustomerDto,
  ) {
    return this.customers.setBlocked(id, dto.isBlocked, user.userId);
  }

  @Post('orders/:id/refund')
  @Roles(...OPS)
  @RequirePermissions('ops.write')
  refund(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RefundDto,
  ) {
    return this.orderEvents.recordRefund(
      id,
      user.userId,
      dto.reason,
      dto.amount,
    );
  }

  @Get('orders/:id')
  @Roles(...OPS)
  @RequirePermissions('ops.read')
  async getOrder(@Param('id', ParseUUIDPipe) id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: { include: { user: { select: { email: true } } } },
        fulfillments: { include: { shop: true, driver: true } },
        items: { include: { product: true } },
        events: { orderBy: { createdAt: 'asc' }, take: 50 },
      },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  @Post('orders/:id/complaint')
  @Roles(...OPS)
  @RequirePermissions('ops.write')
  complaint(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ComplaintDto,
  ) {
    return this.orderEvents.recordComplaint(id, user.userId, dto.note);
  }

  @Post('customers/:id/recalculate-risk')
  @Roles(...OPS)
  @RequirePermissions('ops.write')
  recalcRisk(@Param('id', ParseUUIDPipe) id: string) {
    return this.risk.recalculateCustomer(id).then((riskScore) => ({
      customerId: id,
      riskScore,
    }));
  }

  @Get('analytics/summary')
  @Roles(...OPS)
  @RequirePermissions('analytics.read')
  analyticsSummary() {
    return this.analytics.summary();
  }

  @Get('shops')
  @Roles(...OPS)
  @RequirePermissions('shops.read')
  listShops() {
    return this.shops.listAll();
  }

  @Get('shops/directory')
  @Roles(...OPS)
  @RequirePermissions('shops.read')
  listPartnerShopsDirectory() {
    return this.overview.listPartnerShops();
  }

  @Get('shops/:shopId/overview')
  @Roles(...OPS)
  @RequirePermissions('shops.read')
  shopOverview(@Param('shopId', ParseUUIDPipe) shopId: string) {
    return this.overview.shopOverview(shopId);
  }

  @Post('shops')
  @Roles(...OPS)
  @RequirePermissions('shops.write')
  createShop(@Body() dto: CreateShopDto) {
    return this.shops.create(dto);
  }

  @Post('shops/:shopId/products')
  @Roles(...OPS)
  @RequirePermissions('shops.write')
  upsertShopProduct(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Body() dto: UpsertShopProductDto,
  ) {
    return this.shops.upsertShopProduct(shopId, dto);
  }

  @Get('drivers')
  @Roles(...OPS)
  @RequirePermissions('drivers.read')
  listDrivers() {
    return this.prisma.driver.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        phone: true,
        user: { select: { email: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  @Get('drivers/directory')
  @Roles(...OPS)
  @RequirePermissions('drivers.read')
  listDriversDirectory() {
    return this.overview.listDriversDirectory();
  }

  @Get('drivers/:driverId/overview')
  @Roles(...OPS)
  @RequirePermissions('drivers.read')
  driverOverview(@Param('driverId', ParseUUIDPipe) driverId: string) {
    return this.overview.driverOverview(driverId);
  }

  @Get('users')
  @Roles(...PLATFORM)
  @RequirePermissions('users.read')
  listUsers() {
    return this.users.listUsers();
  }

  @Post('users')
  @Roles(...PLATFORM)
  @RequirePermissions('users.write')
  createUser(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: CreateAdminUserDto,
  ) {
    return this.users.createUser(dto, user.role as UserRole);
  }

  @Patch('users/:id')
  @Roles(...PLATFORM)
  @RequirePermissions('users.write')
  updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminUserDto,
  ) {
    return this.users.updateUser(id, dto);
  }

  @Put('users/:id/active')
  @Roles(...PLATFORM)
  @RequirePermissions('users.write')
  setUserActive(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetUserActiveDto,
  ) {
    return this.users.setActive(id, dto.isActive, user.userId);
  }

  @Delete('users/:id')
  @Roles(...PLATFORM)
  @RequirePermissions('users.write')
  deleteUser(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.users.deleteUser(id, user.userId);
  }

  @Post('products/import')
  @Roles(...OPS)
  @RequirePermissions('catalogue.write')
  @UseInterceptors(FileInterceptor('file'))
  async importProducts(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Query('shopId') shopId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('file is required');
    }
    const rows = this.parseFile(file);
    const results: Array<{ barcode: string; productId: string }> = [];
    const errors: Array<{ row: number; message: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        assertBarcodeRequired(row.barcode);
        if (!row.name?.trim() || !row.slug?.trim()) {
          throw new Error('name and slug are required');
        }
        const result = await this.products.upsertFromImport(row, shopId);
        results.push(result);
      } catch (e) {
        errors.push({
          row: i + 2,
          message: e instanceof Error ? e.message : 'Unknown error',
        });
      }
    }

    return {
      imported: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }

  @Get('products/export')
  @Roles(...OPS)
  @RequirePermissions('catalogue.read')
  async exportProducts(
    @Query('format') format: string | undefined,
    @Res() res: Response,
  ) {
    const rows = await this.products.exportRows();
    const fmt = (format ?? 'csv').toLowerCase();

    if (fmt === 'xlsx' || fmt === 'excel') {
      const sheet = XLSX.utils.json_to_sheet(rows);
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, 'products');
      const buffer = XLSX.write(book, {
        type: 'buffer',
        bookType: 'xlsx',
      }) as Buffer;
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="products.xlsx"',
      );
      return res.send(buffer);
    }

    const csv = stringify(rows, { header: true });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="products.csv"',
    );
    return res.send(csv);
  }

  private parseFile(file: Express.Multer.File): ProductImportRow[] {
    const name = file.originalname.toLowerCase();
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      return XLSX.utils.sheet_to_json<ProductImportRow>(sheet);
    }
    const text = file.buffer.toString('utf8');
    return parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as ProductImportRow[];
  }
}
