import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FulfillmentMode, Prisma, ShopKind } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateCurrencyDto,
  CreateLanguageDto,
  PublishWarehouseDto,
  UpdateCurrencyDto,
  UpdateDeliveryFeesDto,
  UpdateLanguageDto,
  UpdatePromotionsDto,
  UpsertWarehouseDto,
  ValidateCouponDto,
} from './dto/platform-locale.dto';

export const DELIVERY_FEE_SETTING_KEY = 'delivery_fee_amount';
export const PICKUP_FEE_SETTING_KEY = 'pickup_fee_amount';
export const DELIVERY_FREE_OVER_SETTING_KEY = 'delivery_free_over_amount';
export const DELIVERY_FEES_BY_AREA_SETTING_KEY = 'delivery_fees_by_area';
export const CART_PROMO_SETTING_KEY = 'cart_promo';
export const COUPONS_SETTING_KEY = 'coupons';
export const WAREHOUSE_PUBLISHED_SETTING_KEY =
  'warehouse_fulfillment_published';
const DEFAULT_DELIVERY_FEE = '3.99';
const DEFAULT_PICKUP_FEE = '0';
const DEFAULT_FREE_OVER = '0';
const WAREHOUSE_SEED_ID = '00000000-0000-4000-8000-0000000000aa';

type CouponRule = {
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  active: boolean;
};

type CartPromo = {
  bannerEnabled: boolean;
  bannerMessage: string;
};

@Injectable()
export class PlatformLocaleService {
  constructor(private readonly prisma: PrismaService) {}

  listCurrencies() {
    return this.prisma.platformCurrency.findMany({
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    });
  }

  listLanguages() {
    return this.prisma.platformLanguage.findMany({
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    });
  }

  async getPublicLocale() {
    const [currencies, languages] = await Promise.all([
      this.prisma.platformCurrency.findMany({
        where: { isPublished: true },
        orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
      }),
      this.prisma.platformLanguage.findMany({
        where: { isPublished: true },
        orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
      }),
    ]);

    const defaultCurrency =
      currencies.find((c) => c.isDefault) ?? currencies[0] ?? null;
    const defaultLanguage =
      languages.find((l) => l.isDefault) ?? languages[0] ?? null;

    return {
      currencies,
      languages,
      showCurrencyPicker: currencies.length > 1,
      showLanguagePicker: languages.length > 1,
      defaultCurrencyCode: defaultCurrency?.code ?? 'EUR',
      defaultLanguageCode: defaultLanguage?.code ?? 'en',
    };
  }

  async getBranding() {
    const row = await this.prisma.platformSetting.findUnique({
      where: { key: 'hero_background_url' },
    });
    return {
      heroBackgroundUrl: row?.value || null,
    };
  }

  async setBranding(heroBackgroundUrl: string) {
    const value = heroBackgroundUrl.trim();
    await this.prisma.platformSetting.upsert({
      where: { key: 'hero_background_url' },
      create: { key: 'hero_background_url', value },
      update: { value },
    });
    return this.getBranding();
  }

  async getDeliveryFees() {
    const [deliveryRow, pickupRow, freeOverRow, byAreaRow] = await Promise.all([
      this.prisma.platformSetting.findUnique({
        where: { key: DELIVERY_FEE_SETTING_KEY },
      }),
      this.prisma.platformSetting.findUnique({
        where: { key: PICKUP_FEE_SETTING_KEY },
      }),
      this.prisma.platformSetting.findUnique({
        where: { key: DELIVERY_FREE_OVER_SETTING_KEY },
      }),
      this.prisma.platformSetting.findUnique({
        where: { key: DELIVERY_FEES_BY_AREA_SETTING_KEY },
      }),
    ]);
    return {
      scheduledDeliveryFee: this.parseFee(
        deliveryRow?.value,
        DEFAULT_DELIVERY_FEE,
      ),
      pickupFee: this.parseFee(pickupRow?.value, DEFAULT_PICKUP_FEE),
      freeDeliveryOverAmount: this.parseFee(
        freeOverRow?.value,
        DEFAULT_FREE_OVER,
      ),
      feesByArea: this.parseFeesByArea(byAreaRow?.value),
    };
  }

  async setDeliveryFees(dto: UpdateDeliveryFeesDto) {
    const feesByArea = this.normalizeFeesByArea(dto.feesByArea ?? {});
    await Promise.all([
      this.prisma.platformSetting.upsert({
        where: { key: DELIVERY_FEE_SETTING_KEY },
        create: {
          key: DELIVERY_FEE_SETTING_KEY,
          value: this.formatFee(dto.scheduledDeliveryFee),
        },
        update: { value: this.formatFee(dto.scheduledDeliveryFee) },
      }),
      this.prisma.platformSetting.upsert({
        where: { key: PICKUP_FEE_SETTING_KEY },
        create: {
          key: PICKUP_FEE_SETTING_KEY,
          value: this.formatFee(dto.pickupFee),
        },
        update: { value: this.formatFee(dto.pickupFee) },
      }),
      this.prisma.platformSetting.upsert({
        where: { key: DELIVERY_FREE_OVER_SETTING_KEY },
        create: {
          key: DELIVERY_FREE_OVER_SETTING_KEY,
          value: this.formatFee(dto.freeDeliveryOverAmount ?? 0),
        },
        update: {
          value: this.formatFee(dto.freeDeliveryOverAmount ?? 0),
        },
      }),
      this.prisma.platformSetting.upsert({
        where: { key: DELIVERY_FEES_BY_AREA_SETTING_KEY },
        create: {
          key: DELIVERY_FEES_BY_AREA_SETTING_KEY,
          value: JSON.stringify(feesByArea),
        },
        update: { value: JSON.stringify(feesByArea) },
      }),
    ]);
    return this.getDeliveryFees();
  }

  /**
   * Dynamic fee: pickup fee, or area/default scheduled fee,
   * then free if subtotal meets freeDeliveryOverAmount (> 0).
   */
  async resolveDeliveryFee(input: {
    mode: FulfillmentMode;
    deliveryAreaName?: string | null;
    subtotal: Prisma.Decimal | number | string;
  }): Promise<Prisma.Decimal> {
    const fees = await this.getDeliveryFees();
    if (input.mode === FulfillmentMode.pickup) {
      return new Prisma.Decimal(fees.pickupFee);
    }

    const area = input.deliveryAreaName?.trim() ?? '';
    const areaFee =
      area && fees.feesByArea[area] != null
        ? fees.feesByArea[area]
        : fees.scheduledDeliveryFee;

    const subtotal = new Prisma.Decimal(input.subtotal);
    if (
      fees.freeDeliveryOverAmount > 0 &&
      subtotal.greaterThanOrEqualTo(fees.freeDeliveryOverAmount)
    ) {
      return new Prisma.Decimal(0);
    }
    return new Prisma.Decimal(areaFee);
  }

  /** @deprecated prefer resolveDeliveryFee with area + subtotal */
  async feeForFulfillmentMode(
    mode: FulfillmentMode,
  ): Promise<Prisma.Decimal> {
    return this.resolveDeliveryFee({ mode, subtotal: 0 });
  }

  async getPublicDeliveryConfig() {
    const [fees, rows] = await Promise.all([
      this.getDeliveryFees(),
      this.prisma.deliveryCalendar.findMany({
        where: { isActive: true },
        orderBy: [{ areaName: 'asc' }, { deliveryDay: 'asc' }],
      }),
    ]);

    const byArea = new Map<string, string[]>();
    for (const row of rows) {
      const days = byArea.get(row.areaName) ?? [];
      days.push(row.deliveryDay);
      byArea.set(row.areaName, days);
    }

    const areas = Array.from(byArea.entries()).map(
      ([areaName, deliveryDays]) => ({
        areaName,
        deliveryDays,
        deliveryFee:
          fees.feesByArea[areaName] ?? fees.scheduledDeliveryFee,
      }),
    );

    return {
      scheduledDeliveryFee: fees.scheduledDeliveryFee,
      pickupFee: fees.pickupFee,
      freeDeliveryOverAmount: fees.freeDeliveryOverAmount,
      feesByArea: fees.feesByArea,
      areas,
    };
  }

  async getPromotionsAdmin() {
    const [promo, coupons] = await Promise.all([
      this.getCartPromo(),
      this.getCoupons(),
    ]);
    return { ...promo, coupons };
  }

  async setPromotions(dto: UpdatePromotionsDto) {
    const current = await this.getPromotionsAdmin();
    const promo: CartPromo = {
      bannerEnabled: dto.bannerEnabled ?? current.bannerEnabled,
      bannerMessage:
        dto.bannerMessage !== undefined
          ? dto.bannerMessage.trim()
          : current.bannerMessage,
    };
    const coupons =
      dto.coupons !== undefined
        ? this.normalizeCoupons(dto.coupons)
        : current.coupons;

    await Promise.all([
      this.prisma.platformSetting.upsert({
        where: { key: CART_PROMO_SETTING_KEY },
        create: {
          key: CART_PROMO_SETTING_KEY,
          value: JSON.stringify(promo),
        },
        update: { value: JSON.stringify(promo) },
      }),
      this.prisma.platformSetting.upsert({
        where: { key: COUPONS_SETTING_KEY },
        create: {
          key: COUPONS_SETTING_KEY,
          value: JSON.stringify(coupons),
        },
        update: { value: JSON.stringify(coupons) },
      }),
    ]);
    return this.getPromotionsAdmin();
  }

  /** Public cart banner only (no coupon list). */
  async getPublicPromotions() {
    const [promo, fees] = await Promise.all([
      this.getCartPromo(),
      this.getDeliveryFees(),
    ]);

    let banner: { enabled: true; message: string } | null = null;
    if (promo.bannerEnabled && promo.bannerMessage) {
      banner = { enabled: true, message: promo.bannerMessage };
    } else if (fees.freeDeliveryOverAmount > 0) {
      banner = {
        enabled: true,
        message: `Free scheduled delivery on orders over €${fees.freeDeliveryOverAmount.toFixed(2)}`,
      };
    }

    return { banner };
  }

  async validateCoupon(dto: ValidateCouponDto) {
    const code = dto.code.trim().toUpperCase();
    if (!code) {
      return { ok: false as const, message: 'Enter a code' };
    }
    const coupons = await this.getCoupons();
    const rule = coupons.find((c) => c.code === code && c.active);
    if (!rule) {
      return { ok: false as const, message: 'Code not recognised' };
    }
    const subtotal = Math.max(0, Number(dto.subtotal) || 0);
    const discountAmount = this.computeCouponDiscount(rule, subtotal);
    return {
      ok: true as const,
      code: rule.code,
      type: rule.type,
      value: rule.value,
      discountAmount,
      message: `Applied ${rule.code}`,
    };
  }

  computeCouponDiscount(
    rule: Pick<CouponRule, 'type' | 'value'>,
    subtotal: number,
  ): number {
    const sub = Math.max(0, subtotal);
    if (rule.type === 'percent') {
      return Math.round(sub * (rule.value / 100) * 100) / 100;
    }
    return Math.min(rule.value, sub);
  }

  private async getCartPromo(): Promise<CartPromo> {
    const row = await this.prisma.platformSetting.findUnique({
      where: { key: CART_PROMO_SETTING_KEY },
    });
    if (!row?.value) {
      return {
        bannerEnabled: true,
        bannerMessage: 'You have reduced delivery charge',
      };
    }
    try {
      const parsed = JSON.parse(row.value) as Partial<CartPromo>;
      return {
        bannerEnabled: Boolean(parsed.bannerEnabled),
        bannerMessage:
          typeof parsed.bannerMessage === 'string'
            ? parsed.bannerMessage
            : 'You have reduced delivery charge',
      };
    } catch {
      return {
        bannerEnabled: true,
        bannerMessage: 'You have reduced delivery charge',
      };
    }
  }

  private async getCoupons(): Promise<CouponRule[]> {
    const row = await this.prisma.platformSetting.findUnique({
      where: { key: COUPONS_SETTING_KEY },
    });
    if (!row?.value) {
      return this.defaultCoupons();
    }
    try {
      const parsed = JSON.parse(row.value) as unknown;
      if (!Array.isArray(parsed)) return this.defaultCoupons();
      return this.normalizeCoupons(parsed);
    } catch {
      return this.defaultCoupons();
    }
  }

  private defaultCoupons(): CouponRule[] {
    return [
      { code: 'HALAL10', type: 'percent', value: 10, active: true },
      { code: 'WELCOME5', type: 'fixed', value: 5, active: true },
    ];
  }

  private normalizeCoupons(input: unknown[]): CouponRule[] {
    const out: CouponRule[] = [];
    const seen = new Set<string>();
    for (const raw of input) {
      if (!raw || typeof raw !== 'object') continue;
      const row = raw as Record<string, unknown>;
      const code =
        typeof row.code === 'string' ? row.code.trim().toUpperCase() : '';
      if (!code || seen.has(code)) continue;
      const type = row.type === 'fixed' ? 'fixed' : 'percent';
      const value = Number(row.value);
      if (!Number.isFinite(value) || value < 0) continue;
      if (type === 'percent' && value > 100) continue;
      seen.add(code);
      out.push({
        code,
        type,
        value: Math.round(value * 100) / 100,
        active: row.active === undefined ? true : Boolean(row.active),
      });
    }
    return out;
  }

  async isWarehouseFulfillmentPublished(): Promise<boolean> {
    const row = await this.prisma.platformSetting.findUnique({
      where: { key: WAREHOUSE_PUBLISHED_SETTING_KEY },
    });
    return row?.value === 'true';
  }

  async getWarehouseAdmin() {
    const [published, warehouse] = await Promise.all([
      this.isWarehouseFulfillmentPublished(),
      this.prisma.shop.findFirst({
        where: { kind: ShopKind.warehouse },
        orderBy: { name: 'asc' },
      }),
    ]);
    return { published, warehouse };
  }

  async setWarehousePublished(dto: PublishWarehouseDto) {
    const value = dto.published ? 'true' : 'false';
    await this.prisma.platformSetting.upsert({
      where: { key: WAREHOUSE_PUBLISHED_SETTING_KEY },
      create: { key: WAREHOUSE_PUBLISHED_SETTING_KEY, value },
      update: { value },
    });
    return this.getWarehouseAdmin();
  }

  async upsertWarehouse(dto: UpsertWarehouseDto) {
    const existing = await this.prisma.shop.findFirst({
      where: { kind: ShopKind.warehouse },
      orderBy: { name: 'asc' },
    });

    const zones = Array.isArray(dto.deliveryZones)
      ? dto.deliveryZones.map((z) => z.trim()).filter(Boolean)
      : undefined;

    const data = {
      name: dto.name?.trim() || existing?.name || 'HB Dublin Warehouse',
      kind: ShopKind.warehouse,
      address:
        dto.address !== undefined
          ? dto.address.trim() || null
          : existing?.address,
      lat: dto.lat !== undefined ? dto.lat : existing?.lat,
      lng: dto.lng !== undefined ? dto.lng : existing?.lng,
      isActive:
        dto.isActive !== undefined ? dto.isActive : (existing?.isActive ?? true),
      deliveryZones: (zones ??
        (existing?.deliveryZones as unknown[]) ??
        []) as Prisma.InputJsonValue,
    };

    if (existing) {
      await this.prisma.shop.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await this.prisma.shop.create({
        data: {
          id: WAREHOUSE_SEED_ID,
          ...data,
        },
      });
    }
    return this.getWarehouseAdmin();
  }

  async createCurrency(dto: CreateCurrencyDto) {
    const code = dto.code.toUpperCase();
    try {
      return await this.prisma.platformCurrency.create({
        data: {
          code,
          symbol: dto.symbol,
          name: dto.name,
          exchangeRate: dto.exchangeRate ?? 1,
          isPublished: dto.isPublished ?? false,
          sortOrder: dto.sortOrder ?? 0,
          isDefault: false,
        },
      });
    } catch (e) {
      this.rethrowUnique(e, 'Currency code already exists');
    }
  }

  async updateCurrency(id: string, dto: UpdateCurrencyDto) {
    const row = await this.requireCurrency(id);
    if (row.isDefault && dto.isPublished === false) {
      throw new BadRequestException('Cannot unpublish the default currency');
    }
    try {
      return await this.prisma.platformCurrency.update({
        where: { id },
        data: {
          ...(dto.code !== undefined ? { code: dto.code.toUpperCase() } : {}),
          ...(dto.symbol !== undefined ? { symbol: dto.symbol } : {}),
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.exchangeRate !== undefined
            ? { exchangeRate: dto.exchangeRate }
            : {}),
          ...(dto.isPublished !== undefined
            ? { isPublished: dto.isPublished }
            : {}),
          ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        },
      });
    } catch (e) {
      this.rethrowUnique(e, 'Currency code already exists');
    }
  }

  async setCurrencyPublished(id: string, isPublished: boolean) {
    return this.updateCurrency(id, { isPublished });
  }

  async setDefaultCurrency(id: string) {
    const row = await this.requireCurrency(id);
    return this.prisma.$transaction(async (tx) => {
      await tx.platformCurrency.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
      return tx.platformCurrency.update({
        where: { id: row.id },
        data: { isDefault: true, isPublished: true },
      });
    });
  }

  async deleteCurrency(id: string) {
    const row = await this.requireCurrency(id);
    if (row.isDefault) {
      throw new BadRequestException('Cannot delete the default currency');
    }
    await this.prisma.platformCurrency.delete({ where: { id } });
    return { deleted: true };
  }

  async createLanguage(dto: CreateLanguageDto) {
    const code = dto.code.toLowerCase();
    try {
      return await this.prisma.platformLanguage.create({
        data: {
          code,
          name: dto.name,
          nativeName: dto.nativeName,
          isRtl: dto.isRtl ?? false,
          isPublished: dto.isPublished ?? false,
          sortOrder: dto.sortOrder ?? 0,
          isDefault: false,
        },
      });
    } catch (e) {
      this.rethrowUnique(e, 'Language code already exists');
    }
  }

  async updateLanguage(id: string, dto: UpdateLanguageDto) {
    const row = await this.requireLanguage(id);
    if (row.isDefault && dto.isPublished === false) {
      throw new BadRequestException('Cannot unpublish the default language');
    }
    try {
      return await this.prisma.platformLanguage.update({
        where: { id },
        data: {
          ...(dto.code !== undefined ? { code: dto.code.toLowerCase() } : {}),
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.nativeName !== undefined
            ? { nativeName: dto.nativeName }
            : {}),
          ...(dto.isRtl !== undefined ? { isRtl: dto.isRtl } : {}),
          ...(dto.isPublished !== undefined
            ? { isPublished: dto.isPublished }
            : {}),
          ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        },
      });
    } catch (e) {
      this.rethrowUnique(e, 'Language code already exists');
    }
  }

  async setLanguagePublished(id: string, isPublished: boolean) {
    return this.updateLanguage(id, { isPublished });
  }

  async setDefaultLanguage(id: string) {
    const row = await this.requireLanguage(id);
    return this.prisma.$transaction(async (tx) => {
      await tx.platformLanguage.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
      return tx.platformLanguage.update({
        where: { id: row.id },
        data: { isDefault: true, isPublished: true },
      });
    });
  }

  async deleteLanguage(id: string) {
    const row = await this.requireLanguage(id);
    if (row.isDefault) {
      throw new BadRequestException('Cannot delete the default language');
    }
    await this.prisma.platformLanguage.delete({ where: { id } });
    return { deleted: true };
  }

  private async requireCurrency(id: string) {
    const row = await this.prisma.platformCurrency.findUnique({
      where: { id },
    });
    if (!row) throw new NotFoundException('Currency not found');
    return row;
  }

  private async requireLanguage(id: string) {
    const row = await this.prisma.platformLanguage.findUnique({
      where: { id },
    });
    if (!row) throw new NotFoundException('Language not found');
    return row;
  }

  private parseFee(raw: string | undefined, fallback: string): number {
    const n = Number(raw ?? fallback);
    if (!Number.isFinite(n) || n < 0) return Number(fallback);
    return Math.round(n * 100) / 100;
  }

  private formatFee(n: number): string {
    return (Math.round(n * 100) / 100).toFixed(2);
  }

  private parseFeesByArea(raw: string | undefined): Record<string, number> {
    if (!raw?.trim()) return {};
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return {};
      }
      return this.normalizeFeesByArea(parsed as Record<string, unknown>);
    } catch {
      return {};
    }
  }

  private normalizeFeesByArea(
    input: Record<string, unknown> | Record<string, number>,
  ): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [key, value] of Object.entries(input)) {
      const area = key.trim();
      if (!area) continue;
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0) continue;
      out[area] = Math.round(n * 100) / 100;
    }
    return out;
  }

  private rethrowUnique(e: unknown, message: string): never {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      throw new BadRequestException(message);
    }
    throw e;
  }
}
