import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FulfillmentMode, OrderStatus, Prisma, ShopKind } from '@prisma/client';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateCurrencyDto,
  CreateLanguageDto,
  CreateWarehouseDto,
  PublishWarehouseDto,
  UpdateCurrencyDto,
  UpdateDeliveryFeesDto,
  UpdateLanguageDto,
  UpdatePromotionsDto,
  UpdateWarehouseDto,
  ValidateCouponDto,
} from './dto/platform-locale.dto';
import {
  getPublishedWarehouseIds,
  setPublishedWarehouseIds,
} from './warehouse-publish';

export { WAREHOUSE_PUBLISHED_SETTING_KEY } from './warehouse-publish';

export const DELIVERY_FEE_SETTING_KEY = 'delivery_fee_amount';
export const PICKUP_FEE_SETTING_KEY = 'pickup_fee_amount';
export const DELIVERY_FREE_OVER_SETTING_KEY = 'delivery_free_over_amount';
export const DELIVERY_FEES_BY_AREA_SETTING_KEY = 'delivery_fees_by_area';
export const CART_PROMO_SETTING_KEY = 'cart_promo';
export const COUPONS_SETTING_KEY = 'coupons';
export const HERO_BACKGROUND_SETTING_KEY = 'hero_background_url';
export const LANDING_BRANDING_SETTING_KEY = 'landing_branding';
const DEFAULT_DELIVERY_FEE = '3.99';
const DEFAULT_PICKUP_FEE = '0';
const DEFAULT_FREE_OVER = '0';

export const DEFAULT_HERO_TITLE =
  'Halal groceries delivered or ready for pickup';
export const DEFAULT_HERO_SUBTITLE =
  'From trusted local halal shops in Dublin';
export const PLATFORM_DEFAULT_BRANDING_ID = 'platform-default';
export const DEFAULT_HERO_IMAGE_URL =
  'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1600&q=80';

type BrandingItemStored = {
  id: string;
  heroBackgroundUrl: string;
  heroTitle: string;
  heroSubtitle: string;
  isPlatformDefault: boolean;
};

type LandingBrandingStore = {
  version: 2;
  activeId: string;
  items: BrandingItemStored[];
};

type CouponRule = {
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  maxLimit: number | null;
  maxLimitPerUser: number | null;
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


  /** Public: active hero only (customer landing). */
  async getBranding() {
    const store = await this.readLandingBrandingStore();
    const active =
      store.items.find((i) => i.id === store.activeId) ??
      store.items.find((i) => i.isPlatformDefault) ??
      this.platformDefaultItem();
    return this.toPublicBranding(active);
  }

  /** Admin: all heroes + which one is live. */
  async getBrandingAdmin() {
    const store = await this.readLandingBrandingStore();
    return {
      activeId: store.activeId,
      items: store.items.map((item) => this.toAdminBrandingItem(item)),
    };
  }

  async createBrandingItem(dto: {
    heroBackgroundUrl?: string;
    heroTitle: string;
    heroSubtitle: string;
    setActive?: boolean;
  }) {
    const store = await this.readLandingBrandingStore();
    const item: BrandingItemStored = {
      id: randomUUID(),
      heroBackgroundUrl: this.normalizeHeroBackgroundUrl(
        dto.heroBackgroundUrl ?? '',
      ),
      heroTitle: this.normalizeHeroText(dto.heroTitle, 120, 'title'),
      heroSubtitle: this.normalizeHeroText(dto.heroSubtitle, 200, 'subtitle'),
      isPlatformDefault: false,
    };
    store.items.push(item);
    if (dto.setActive) store.activeId = item.id;
    await this.writeLandingBrandingStore(store);
    return this.getBrandingAdmin();
  }

  async updateBrandingItem(
    id: string,
    dto: {
      heroBackgroundUrl?: string;
      heroTitle?: string;
      heroSubtitle?: string;
    },
  ) {
    const store = await this.readLandingBrandingStore();
    const item = store.items.find((i) => i.id === id);
    if (!item) throw new NotFoundException('Branding item not found');
    if (item.isPlatformDefault) {
      throw new BadRequestException(
        'The platform default branding cannot be modified.',
      );
    }
    if (dto.heroBackgroundUrl !== undefined) {
      item.heroBackgroundUrl = this.normalizeHeroBackgroundUrl(
        dto.heroBackgroundUrl,
      );
    }
    if (dto.heroTitle !== undefined) {
      item.heroTitle = this.normalizeHeroText(dto.heroTitle, 120, 'title');
    }
    if (dto.heroSubtitle !== undefined) {
      item.heroSubtitle = this.normalizeHeroText(
        dto.heroSubtitle,
        200,
        'subtitle',
      );
    }
    await this.writeLandingBrandingStore(store);
    return this.getBrandingAdmin();
  }

  async deleteBrandingItem(id: string) {
    const store = await this.readLandingBrandingStore();
    const item = store.items.find((i) => i.id === id);
    if (!item) throw new NotFoundException('Branding item not found');
    if (item.isPlatformDefault) {
      throw new BadRequestException(
        'The platform default branding cannot be deleted.',
      );
    }
    store.items = store.items.filter((i) => i.id !== id);
    if (store.activeId === id) {
      store.activeId = PLATFORM_DEFAULT_BRANDING_ID;
    }
    await this.writeLandingBrandingStore(store);
    return this.getBrandingAdmin();
  }

  async setActiveBranding(activeId: string) {
    const store = await this.readLandingBrandingStore();
    if (!store.items.some((i) => i.id === activeId)) {
      throw new BadRequestException('Branding item not found');
    }
    store.activeId = activeId;
    await this.writeLandingBrandingStore(store);
    return this.getBrandingAdmin();
  }

  async uploadHeroBackground(file: Express.Multer.File | undefined) {
    if (!file) {
      throw new BadRequestException('Please choose an image file to upload.');
    }
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (!allowed.has(file.mimetype)) {
      throw new BadRequestException(
        'Please upload a JPG, PNG, or WebP image.',
      );
    }
    if (file.size > 2_000_000) {
      throw new BadRequestException(
        'That image is too large. Please use a file under 2MB.',
      );
    }

    const dir = join(process.cwd(), 'uploads', 'branding');
    await mkdir(dir, { recursive: true });

    const ext =
      file.mimetype === 'image/png'
        ? '.png'
        : file.mimetype === 'image/webp'
          ? '.webp'
          : '.jpg';
    const filename = `hero-${randomUUID()}${ext}`;
    await writeFile(join(dir, filename), file.buffer);

    const relativePath = `/uploads/branding/${filename}`;
    return {
      url: this.resolvePublicAssetUrl(relativePath)!,
      path: relativePath,
    };
  }

  private platformDefaultItem(): BrandingItemStored {
    return {
      id: PLATFORM_DEFAULT_BRANDING_ID,
      heroBackgroundUrl: '',
      heroTitle: DEFAULT_HERO_TITLE,
      heroSubtitle: DEFAULT_HERO_SUBTITLE,
      isPlatformDefault: true,
    };
  }

  private toPublicBranding(item: BrandingItemStored) {
    return {
      heroBackgroundUrl: this.resolvePublicAssetUrl(
        item.heroBackgroundUrl || null,
      ),
      heroTitle: item.heroTitle || DEFAULT_HERO_TITLE,
      heroSubtitle: item.heroSubtitle || DEFAULT_HERO_SUBTITLE,
    };
  }

  private toAdminBrandingItem(item: BrandingItemStored) {
    return {
      id: item.id,
      heroBackgroundUrl: this.resolvePublicAssetUrl(
        item.heroBackgroundUrl || null,
      ),
      heroBackgroundPath: item.heroBackgroundUrl || '',
      heroTitle: item.heroTitle,
      heroSubtitle: item.heroSubtitle,
      isPlatformDefault: item.isPlatformDefault,
      previewImageUrl:
        this.resolvePublicAssetUrl(item.heroBackgroundUrl || null) ||
        DEFAULT_HERO_IMAGE_URL,
    };
  }

  private async readLandingBrandingStore(): Promise<LandingBrandingStore> {
    const [brandingRow, legacyBg] = await Promise.all([
      this.prisma.platformSetting.findUnique({
        where: { key: LANDING_BRANDING_SETTING_KEY },
      }),
      this.prisma.platformSetting.findUnique({
        where: { key: HERO_BACKGROUND_SETTING_KEY },
      }),
    ]);

    const platform = this.platformDefaultItem();

    if (brandingRow?.value) {
      try {
        const parsed = JSON.parse(brandingRow.value) as Record<string, unknown>;
        if (parsed.version === 2 && Array.isArray(parsed.items)) {
          const itemsRaw = parsed.items as BrandingItemStored[];
          const items: BrandingItemStored[] = [];
          let hasPlatform = false;
          for (const raw of itemsRaw) {
            if (!raw || typeof raw !== 'object') continue;
            const id = typeof raw.id === 'string' ? raw.id : '';
            if (!id) continue;
            const isPlatform =
              Boolean(raw.isPlatformDefault) ||
              id === PLATFORM_DEFAULT_BRANDING_ID;
            if (isPlatform) {
              if (hasPlatform) continue;
              hasPlatform = true;
              items.unshift({ ...platform });
              continue;
            }
            items.push({
              id,
              heroBackgroundUrl:
                typeof raw.heroBackgroundUrl === 'string'
                  ? raw.heroBackgroundUrl
                  : '',
              heroTitle:
                typeof raw.heroTitle === 'string' && raw.heroTitle.trim()
                  ? raw.heroTitle.trim()
                  : DEFAULT_HERO_TITLE,
              heroSubtitle:
                typeof raw.heroSubtitle === 'string' &&
                raw.heroSubtitle.trim()
                  ? raw.heroSubtitle.trim()
                  : DEFAULT_HERO_SUBTITLE,
              isPlatformDefault: false,
            });
          }
          if (!hasPlatform) items.unshift({ ...platform });
          const activeId =
            typeof parsed.activeId === 'string' &&
            items.some((i) => i.id === parsed.activeId)
              ? (parsed.activeId as string)
              : PLATFORM_DEFAULT_BRANDING_ID;
          return { version: 2, activeId, items };
        }

        // Legacy flat object → migrate
        const legacyTitle =
          typeof parsed.heroTitle === 'string' && parsed.heroTitle.trim()
            ? parsed.heroTitle.trim()
            : DEFAULT_HERO_TITLE;
        const legacySubtitle =
          typeof parsed.heroSubtitle === 'string' &&
          parsed.heroSubtitle.trim()
            ? parsed.heroSubtitle.trim()
            : DEFAULT_HERO_SUBTITLE;
        const legacyBgUrl =
          typeof parsed.heroBackgroundUrl === 'string'
            ? parsed.heroBackgroundUrl
            : legacyBg?.value || '';
        const items: BrandingItemStored[] = [{ ...platform }];
        let activeId = PLATFORM_DEFAULT_BRANDING_ID;
        const isCustom =
          Boolean(legacyBgUrl) ||
          legacyTitle !== DEFAULT_HERO_TITLE ||
          legacySubtitle !== DEFAULT_HERO_SUBTITLE;
        if (isCustom) {
          const customId = randomUUID();
          items.push({
            id: customId,
            heroBackgroundUrl: legacyBgUrl,
            heroTitle: legacyTitle,
            heroSubtitle: legacySubtitle,
            isPlatformDefault: false,
          });
          activeId = customId;
        }
        const migrated: LandingBrandingStore = {
          version: 2,
          activeId,
          items,
        };
        await this.writeLandingBrandingStore(migrated);
        return migrated;
      } catch {
        /* fall through */
      }
    }

    const items: BrandingItemStored[] = [{ ...platform }];
    let activeId = PLATFORM_DEFAULT_BRANDING_ID;
    if (legacyBg?.value) {
      const customId = randomUUID();
      items.push({
        id: customId,
        heroBackgroundUrl: legacyBg.value,
        heroTitle: DEFAULT_HERO_TITLE,
        heroSubtitle: DEFAULT_HERO_SUBTITLE,
        isPlatformDefault: false,
      });
      activeId = customId;
    }
    return { version: 2, activeId, items };
  }

  private async writeLandingBrandingStore(store: LandingBrandingStore) {
    const active =
      store.items.find((i) => i.id === store.activeId) ??
      store.items.find((i) => i.isPlatformDefault) ??
      this.platformDefaultItem();
    await Promise.all([
      this.prisma.platformSetting.upsert({
        where: { key: LANDING_BRANDING_SETTING_KEY },
        create: {
          key: LANDING_BRANDING_SETTING_KEY,
          value: JSON.stringify(store),
        },
        update: { value: JSON.stringify(store) },
      }),
      this.prisma.platformSetting.upsert({
        where: { key: HERO_BACKGROUND_SETTING_KEY },
        create: {
          key: HERO_BACKGROUND_SETTING_KEY,
          value: active.heroBackgroundUrl,
        },
        update: { value: active.heroBackgroundUrl },
      }),
    ]);
  }

  private normalizeHeroText(
    raw: string,
    max: number,
    label: 'title' | 'subtitle',
  ): string {
    const value = raw.trim().replace(/\s+/g, ' ');
    if (!value) {
      throw new BadRequestException(`Hero ${label} is required.`);
    }
    if (value.length > max) {
      throw new BadRequestException(
        `Hero ${label} must be ${max} characters or fewer.`,
      );
    }
    return value;
  }

  private normalizeHeroBackgroundUrl(raw: string): string {
    const value = raw.trim();
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) {
      if (value.length > 2048) {
        throw new BadRequestException(
          'That image link is too long. Please use a shorter URL.',
        );
      }
      return value;
    }
    if (value.startsWith('/uploads/')) {
      if (value.length > 512) {
        throw new BadRequestException(
          'That image path is too long. Please upload again.',
        );
      }
      return value;
    }
    throw new BadRequestException(
      'Please upload an image file or paste a valid image link.',
    );
  }

  private resolvePublicAssetUrl(value: string | null): string | null {
    if (!value) return null;
    if (/^https?:\/\//i.test(value)) return value;
    if (value.startsWith('/uploads/')) {
      const base = (
        process.env.PUBLIC_API_URL ?? 'http://localhost:3000'
      ).replace(/\/$/, '');
      return `${base}${value}`;
    }
    return value;
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

  async validateCoupon(
    dto: ValidateCouponDto,
    opts?: { customerId?: string; userId?: string },
  ) {
    const code = dto.code.trim().toUpperCase();
    if (!code) {
      return {
        ok: false as const,
        message: 'Enter a code',
        reason: 'enter_code' as const,
      };
    }
    const coupons = await this.getCoupons();
    const rule = coupons.find((c) => c.code === code && c.active);
    if (!rule) {
      return {
        ok: false as const,
        message: 'Code not recognised',
        reason: 'not_recognised' as const,
      };
    }

    const now = Date.now();
    if (rule.startsAt) {
      const start = Date.parse(rule.startsAt);
      if (Number.isFinite(start) && now < start) {
        return {
          ok: false as const,
          message: 'Code is not active yet',
          reason: 'not_active' as const,
        };
      }
    }
    if (rule.endsAt) {
      const end = Date.parse(rule.endsAt);
      if (Number.isFinite(end) && now > end) {
        return {
          ok: false as const,
          message: 'Code has expired',
          reason: 'expired' as const,
        };
      }
    }

    if (rule.maxLimit != null) {
      const used = await this.countCouponRedemptions(rule.code);
      if (used >= rule.maxLimit) {
        return {
          ok: false as const,
          message: 'Code has reached its limit',
          reason: 'limit_reached' as const,
        };
      }
    }

    let customerId = opts?.customerId;
    if (!customerId && opts?.userId) {
      const customer = await this.prisma.customer.findUnique({
        where: { userId: opts.userId },
        select: { id: true },
      });
      customerId = customer?.id;
    }

    if (rule.maxLimitPerUser != null) {
      if (!customerId) {
        return {
          ok: false as const,
          message: 'Sign in to use this coupon',
          reason: 'sign_in' as const,
        };
      }
      const usedByCustomer = await this.countCouponRedemptions(
        rule.code,
        customerId,
      );
      if (usedByCustomer >= rule.maxLimitPerUser) {
        return {
          ok: false as const,
          message: 'You have already used this code',
          reason: 'already_used' as const,
        };
      }
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
      reason: 'applied' as const,
    };
  }

  private async countCouponRedemptions(
    code: string,
    customerId?: string,
  ): Promise<number> {
    return this.prisma.order.count({
      where: {
        couponCode: code,
        status: { not: OrderStatus.cancelled },
        ...(customerId ? { customerId } : {}),
      },
    });
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
      {
        code: 'HALAL10',
        type: 'percent',
        value: 10,
        active: true,
        startsAt: null,
        endsAt: null,
        maxLimit: null,
        maxLimitPerUser: null,
      },
      {
        code: 'WELCOME5',
        type: 'fixed',
        value: 5,
        active: true,
        startsAt: null,
        endsAt: null,
        maxLimit: null,
        maxLimitPerUser: 1,
      },
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
      const startsAt = this.normalizeOptionalIso(row.startsAt);
      const endsAt = this.normalizeOptionalIso(row.endsAt);
      if (startsAt && endsAt && Date.parse(startsAt) > Date.parse(endsAt)) {
        continue;
      }
      const maxLimit = this.normalizeOptionalPositiveInt(row.maxLimit);
      const maxLimitPerUser = this.normalizeOptionalPositiveInt(
        row.maxLimitPerUser,
      );
      seen.add(code);
      out.push({
        code,
        type,
        value: Math.round(value * 100) / 100,
        active: row.active === undefined ? true : Boolean(row.active),
        startsAt,
        endsAt,
        maxLimit,
        maxLimitPerUser,
      });
    }
    return out;
  }

  private normalizeOptionalIso(value: unknown): string | null {
    if (value == null || value === '') return null;
    if (typeof value !== 'string') return null;
    const ms = Date.parse(value);
    if (!Number.isFinite(ms)) return null;
    return new Date(ms).toISOString();
  }

  private normalizeOptionalPositiveInt(value: unknown): number | null {
    if (value == null || value === '') return null;
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1) return null;
    return n;
  }

  async isWarehouseFulfillmentPublished(): Promise<boolean> {
    const ids = await getPublishedWarehouseIds(this.prisma);
    return ids.length > 0;
  }

  async listWarehousesAdmin() {
    const [warehouses, publishedIds] = await Promise.all([
      this.prisma.shop.findMany({
        where: { kind: ShopKind.warehouse },
        orderBy: { name: 'asc' },
      }),
      getPublishedWarehouseIds(this.prisma),
    ]);
    const published = new Set(publishedIds);
    return warehouses.map((w) => ({
      id: w.id,
      name: w.name,
      address: w.address,
      lat: w.lat,
      lng: w.lng,
      isActive: w.isActive,
      deliveryZones: w.deliveryZones,
      published: published.has(w.id),
    }));
  }

  /** @deprecated Single-warehouse shape; prefer listWarehousesAdmin. */
  async getWarehouseAdmin() {
    const warehouses = await this.listWarehousesAdmin();
    const first = warehouses[0] ?? null;
    return {
      published: warehouses.some((w) => w.published),
      warehouse: first
        ? {
            id: first.id,
            name: first.name,
            address: first.address,
            lat: first.lat,
            lng: first.lng,
            isActive: first.isActive,
            deliveryZones: first.deliveryZones,
          }
        : null,
    };
  }

  async createWarehouse(dto: CreateWarehouseDto) {
    const zones = Array.isArray(dto.deliveryZones)
      ? dto.deliveryZones.map((z) => z.trim()).filter(Boolean)
      : [];
    const warehouse = await this.prisma.shop.create({
      data: {
        name: dto.name.trim(),
        kind: ShopKind.warehouse,
        address: dto.address?.trim() || null,
        lat: dto.lat ?? null,
        lng: dto.lng ?? null,
        isActive: dto.isActive ?? true,
        deliveryZones: zones as Prisma.InputJsonValue,
      },
    });
    if (dto.published) {
      const ids = await getPublishedWarehouseIds(this.prisma);
      await setPublishedWarehouseIds(this.prisma, [...ids, warehouse.id]);
    }
    return this.listWarehousesAdmin();
  }

  async updateWarehouse(id: string, dto: UpdateWarehouseDto) {
    const existing = await this.requireWarehouse(id);
    const zones = Array.isArray(dto.deliveryZones)
      ? dto.deliveryZones.map((z) => z.trim()).filter(Boolean)
      : undefined;
    await this.prisma.shop.update({
      where: { id: existing.id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.address !== undefined
          ? { address: dto.address.trim() || null }
          : {}),
        ...(dto.lat !== undefined ? { lat: dto.lat } : {}),
        ...(dto.lng !== undefined ? { lng: dto.lng } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(zones !== undefined
          ? { deliveryZones: zones as Prisma.InputJsonValue }
          : {}),
      },
    });
    return this.listWarehousesAdmin();
  }

  async deleteWarehouse(id: string) {
    await this.requireWarehouse(id);
    const publishedIds = await getPublishedWarehouseIds(this.prisma);
    await this.prisma.shop.delete({ where: { id } });
    if (publishedIds.includes(id)) {
      await setPublishedWarehouseIds(
        this.prisma,
        publishedIds.filter((x) => x !== id),
      );
    }
    return this.listWarehousesAdmin();
  }

  async setWarehousePublished(id: string, dto: PublishWarehouseDto) {
    await this.requireWarehouse(id);
    const ids = await getPublishedWarehouseIds(this.prisma);
    const next = dto.published
      ? [...new Set([...ids, id])]
      : ids.filter((x) => x !== id);
    await setPublishedWarehouseIds(this.prisma, next);
    return this.listWarehousesAdmin();
  }

  async setWarehouseActive(id: string, isActive: boolean) {
    await this.requireWarehouse(id);
    await this.prisma.shop.update({
      where: { id },
      data: { isActive },
    });
    return this.listWarehousesAdmin();
  }

  /** @deprecated Prefer createWarehouse / updateWarehouse. */
  async upsertWarehouse(dto: UpdateWarehouseDto) {
    const existing = await this.prisma.shop.findFirst({
      where: { kind: ShopKind.warehouse },
      orderBy: { name: 'asc' },
    });
    if (existing) {
      return this.updateWarehouse(existing.id, dto);
    }
    return this.createWarehouse({
      name: dto.name?.trim() || 'HB Dublin Warehouse',
      address: dto.address,
      lat: dto.lat,
      lng: dto.lng,
      isActive: dto.isActive,
      deliveryZones: dto.deliveryZones,
      published: false,
    });
  }

  private async requireWarehouse(id: string) {
    const warehouse = await this.prisma.shop.findFirst({
      where: { id, kind: ShopKind.warehouse },
    });
    if (!warehouse) throw new NotFoundException('Warehouse not found');
    return warehouse;
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
