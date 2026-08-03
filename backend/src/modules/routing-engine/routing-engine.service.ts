import { BadRequestException, Injectable } from '@nestjs/common';
import { FulfillmentMode, Prisma, Shop, ShopKind } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DeliveryCalendarService } from '../delivery-calendar/delivery-calendar.service';
import { FeatureFlagsService } from '../../common/feature-flags.service';
import { LatLng, MapsService } from '../maps/maps.service';
import {
  activeShopsWithPublishedWarehouses,
  getPublishedWarehouseIds,
} from '../platform-locale/warehouse-publish';
import { StockService } from '../stock/stock.service';

export type RouteLineItem = {
  productId: string;
  quantity: number;
};

export type FulfillmentPlan = {
  shopId: string;
  deliveryDate: Date | null;
  estimatedDeliveryAt: Date | null;
  linePricings: Array<{
    productId: string;
    shopProductId: string;
    quantity: number;
    unitPrice: Prisma.Decimal;
  }>;
};

export type RoutingResult = {
  fulfillmentMode: FulfillmentMode;
  fulfillments: FulfillmentPlan[];
};

@Injectable()
export class RoutingEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calendar: DeliveryCalendarService,
    private readonly flags: FeatureFlagsService,
    private readonly maps: MapsService,
    private readonly stock: StockService,
  ) {}

  async route(input: {
    fulfillmentMode: FulfillmentMode;
    preferredShopId?: string;
    deliveryAreaName?: string;
    deliveryAddress?: Record<string, unknown>;
    items: RouteLineItem[];
    customerRiskScore?: number;
    /** Exclude this customer's active holds when checking available qty. */
    customerId?: string;
  }): Promise<RoutingResult> {
    if (!input.items?.length) {
      throw new BadRequestException('Order must include at least one item');
    }

    if (input.fulfillmentMode === FulfillmentMode.pickup) {
      return {
        fulfillmentMode: FulfillmentMode.pickup,
        fulfillments: [
          await this.routePickup({
            preferredShopId: input.preferredShopId,
            deliveryAreaName: input.deliveryAreaName,
            items: input.items,
            customerId: input.customerId,
          }),
        ],
      };
    }

    if (input.fulfillmentMode === FulfillmentMode.scheduled_delivery) {
      return this.routeDeliveryLike({
        mode: FulfillmentMode.scheduled_delivery,
        preferredShopId: input.preferredShopId,
        deliveryAreaName: input.deliveryAreaName,
        deliveryAddress: input.deliveryAddress,
        items: input.items,
        resolveDate: true,
        customerId: input.customerId,
      });
    }

    if (input.fulfillmentMode === FulfillmentMode.realtime_delivery) {
      if (!this.flags.isRealtimeEnabled()) {
        throw new BadRequestException(
          'realtime_delivery is disabled (FEATURE_REALTIME_DELIVERY)',
        );
      }
      const maxRisk = this.flags.realtimeMaxRiskScore();
      if (
        maxRisk > 0 &&
        (input.customerRiskScore ?? 0) >= maxRisk
      ) {
        throw new BadRequestException(
          'realtime_delivery not available for this customer risk score',
        );
      }
      return this.routeDeliveryLike({
        mode: FulfillmentMode.realtime_delivery,
        preferredShopId: input.preferredShopId,
        deliveryAreaName: input.deliveryAreaName,
        deliveryAddress: input.deliveryAddress,
        items: input.items,
        resolveDate: false,
        customerId: input.customerId,
      });
    }

    throw new BadRequestException('Unsupported fulfillment mode');
  }

  /** @deprecated use route() — kept name for call-site migration */
  routeMvp(input: Parameters<RoutingEngineService['route']>[0]) {
    return this.route(input);
  }

  /**
   * Dry-run fulfillment. Never returns shop identity.
   * On failure, lists productIds that no area shop can fulfill.
   */
  async previewAvailability(input: {
    fulfillmentMode: FulfillmentMode;
    preferredShopId?: string;
    deliveryAreaName?: string;
    deliveryAddress?: Record<string, unknown>;
    items: RouteLineItem[];
    customerRiskScore?: number;
    customerId?: string;
  }): Promise<
    | { ok: true }
    | { ok: false; message: string; unavailableProductIds: string[] }
  > {
    try {
      await this.route(input);
      return { ok: true };
    } catch (err) {
      if (!(err instanceof BadRequestException)) throw err;
      const unavailableProductIds = await this.collectUnavailableProductIds(
        input,
      );
      return {
        ok: false,
        message: 'Some items are unavailable in this area',
        unavailableProductIds,
      };
    }
  }

  private async collectUnavailableProductIds(input: {
    fulfillmentMode: FulfillmentMode;
    preferredShopId?: string;
    deliveryAreaName?: string;
    items: RouteLineItem[];
  }): Promise<string[]> {
    const area = input.deliveryAreaName?.trim();
    let shops: Shop[] = [];

    if (input.preferredShopId) {
      const shop = await this.prisma.shop.findFirst({
        where: { id: input.preferredShopId, isActive: true },
      });
      if (shop) shops = [shop];
    } else if (area) {
      shops = await this.shopsServingArea(area);
    } else {
      const publishedWarehouseIds = await getPublishedWarehouseIds(this.prisma);
      shops = await this.prisma.shop.findMany({
        where: activeShopsWithPublishedWarehouses(publishedWarehouseIds),
      });
    }

    if (shops.length === 0) {
      return input.items.map((i) => i.productId);
    }

    const unavailable: string[] = [];
    for (const item of input.items) {
      let ok = false;
      for (const shop of shops) {
        try {
          await this.requireFullStock(shop.id, [item]);
          ok = true;
          break;
        } catch {
          /* next shop */
        }
      }
      if (!ok) unavailable.push(item.productId);
    }

    // Full-basket failed but every line individually available (e.g. no single
    // shop has everything and multi-shop is off) — mark all lines so UI can
    // still block checkout with a clear list.
    if (unavailable.length === 0) {
      return input.items.map((i) => i.productId);
    }
    return unavailable;
  }

  private async routePickup(input: {
    preferredShopId?: string;
    deliveryAreaName?: string;
    items: RouteLineItem[];
    customerId?: string;
  }): Promise<FulfillmentPlan> {
    if (input.preferredShopId) {
      const shop = await this.prisma.shop.findFirst({
        where: { id: input.preferredShopId, isActive: true },
      });
      if (!shop) {
        throw new BadRequestException('Preferred shop not found or inactive');
      }
      const linePricings = await this.requireFullStock(
        shop.id,
        input.items,
        input.customerId,
      );
      return {
        shopId: shop.id,
        deliveryDate: null,
        estimatedDeliveryAt: null,
        linePricings,
      };
    }

    const area = input.deliveryAreaName?.trim();
    if (!area) {
      throw new BadRequestException(
        'delivery_area_name is required for pickup when preferred_shop_id is omitted',
      );
    }

    const candidates = await this.shopsServingArea(area);
    if (candidates.length === 0) {
      throw new BadRequestException(
        `No active shops serve area "${area}" for pickup`,
      );
    }

    const origin = this.maps.areaCentroid(area);
    const ordered = await this.orderFulfillmentCandidates(
      candidates,
      origin,
    );

    for (const shop of ordered) {
      try {
        const linePricings = await this.requireFullStock(
          shop.id,
          input.items,
          input.customerId,
        );
        return {
          shopId: shop.id,
          deliveryDate: null,
          estimatedDeliveryAt: null,
          linePricings,
        };
      } catch {
        /* try next */
      }
    }

    throw new BadRequestException(
      'No shop can fulfill this basket for pickup in the selected area',
    );
  }

  private async routeDeliveryLike(input: {
    mode: FulfillmentMode;
    preferredShopId?: string;
    deliveryAreaName?: string;
    deliveryAddress?: Record<string, unknown>;
    items: RouteLineItem[];
    resolveDate: boolean;
    customerId?: string;
  }): Promise<RoutingResult> {
    if (!input.deliveryAreaName?.trim()) {
      throw new BadRequestException(
        'delivery_area_name is required for this fulfillment mode',
      );
    }

    let deliveryDate: Date | null = null;
    let estimatedDeliveryAt: Date | null = null;
    if (input.resolveDate) {
      deliveryDate = (
        await this.calendar.resolveNextDeliveryDate(input.deliveryAreaName)
      ).deliveryDate;
    } else {
      const etaMs = this.flags.realtimeEtaMinutes() * 60 * 1000;
      estimatedDeliveryAt = new Date(Date.now() + etaMs);
    }

    const candidates = await this.shopsServingArea(input.deliveryAreaName);
    if (candidates.length === 0) {
      throw new BadRequestException(
        `No active shops serve area "${input.deliveryAreaName}"`,
      );
    }

    const origin =
      this.maps.extractLatLng(input.deliveryAddress) ??
      this.maps.areaCentroid(input.deliveryAreaName);

    const ordered = await this.orderFulfillmentCandidates(
      candidates,
      origin,
      input.preferredShopId,
    );

    // Prefer single-shop fulfillment
    for (const shop of ordered) {
      try {
        const linePricings = await this.requireFullStock(
          shop.id,
          input.items,
          input.customerId,
        );
        return {
          fulfillmentMode: input.mode,
          fulfillments: [
            {
              shopId: shop.id,
              deliveryDate,
              estimatedDeliveryAt,
              linePricings,
            },
          ],
        };
      } catch {
        /* try next / multi-shop */
      }
    }

    if (!this.flags.isMultiShopEnabled()) {
      throw new BadRequestException(
        'No single shop can fulfill this basket (enable FEATURE_MULTI_SHOP to split)',
      );
    }

    const fulfillments = await this.partitionMultiShop(
      ordered,
      input.items,
      deliveryDate,
      estimatedDeliveryAt,
      input.customerId,
    );

    return { fulfillmentMode: input.mode, fulfillments };
  }

  private async partitionMultiShop(
    shops: Shop[],
    items: RouteLineItem[],
    deliveryDate: Date | null,
    estimatedDeliveryAt: Date | null,
    customerId?: string,
  ): Promise<FulfillmentPlan[]> {
    const plans = new Map<string, FulfillmentPlan>();

    for (const item of items) {
      let assigned = false;
      for (const shop of shops) {
        try {
          const [line] = await this.requireFullStock(
            shop.id,
            [item],
            customerId,
          );
          const existing = plans.get(shop.id);
          if (existing) {
            existing.linePricings.push(line);
          } else {
            plans.set(shop.id, {
              shopId: shop.id,
              deliveryDate,
              estimatedDeliveryAt,
              linePricings: [line],
            });
          }
          assigned = true;
          break;
        } catch {
          /* next shop */
        }
      }
      if (!assigned) {
        throw new BadRequestException(
          `Cannot fulfill product ${item.productId} at any shop in zone`,
        );
      }
    }

    if (plans.size < 2) {
      // Should not happen if single-shop already failed, but keep one plan valid
      return [...plans.values()];
    }
    return [...plans.values()];
  }

  private async shopsServingArea(deliveryAreaName: string) {
    const publishedWarehouseIds = await getPublishedWarehouseIds(this.prisma);
    const shops = await this.prisma.shop.findMany({
      where: activeShopsWithPublishedWarehouses(publishedWarehouseIds),
    });
    const area = deliveryAreaName.trim().toLowerCase();
    return shops.filter((shop) => {
      const zones = Array.isArray(shop.deliveryZones)
        ? (shop.deliveryZones as unknown[])
        : [];
      return zones.some(
        (z) => typeof z === 'string' && z.trim().toLowerCase() === area,
      );
    });
  }

  /** Warehouses first (when present), then partners by distance. */
  private async orderFulfillmentCandidates(
    candidates: Shop[],
    origin: LatLng | null,
    preferredShopId?: string,
  ): Promise<Shop[]> {
    const warehouses = candidates.filter((s) => s.kind === ShopKind.warehouse);
    const partners = candidates.filter((s) => s.kind !== ShopKind.warehouse);
    const orderedWarehouses = this.sortByDistance(warehouses, origin);
    const orderedPartners = this.sortByDistance(
      partners,
      origin,
      preferredShopId,
    );
    return [...orderedWarehouses, ...orderedPartners];
  }

  private sortByDistance(
    shops: Shop[],
    origin: LatLng | null,
    preferredShopId?: string,
  ): Shop[] {
    const copy = [...shops];
    copy.sort((a, b) => {
      if (preferredShopId) {
        if (a.id === preferredShopId) return -1;
        if (b.id === preferredShopId) return 1;
      }
      if (origin) {
        const da =
          a.lat != null && a.lng != null
            ? this.maps.distanceKm(origin, { lat: a.lat, lng: a.lng })
            : Number.POSITIVE_INFINITY;
        const db =
          b.lat != null && b.lng != null
            ? this.maps.distanceKm(origin, { lat: b.lat, lng: b.lng })
            : Number.POSITIVE_INFINITY;
        if (da !== db) return da - db;
      } else {
        const aHas = a.lat != null && a.lng != null;
        const bHas = b.lat != null && b.lng != null;
        if (aHas && !bHas) return -1;
        if (!aHas && bHas) return 1;
      }
      return a.id.localeCompare(b.id);
    });
    return copy;
  }

  private async requireFullStock(
    shopId: string,
    items: RouteLineItem[],
    customerId?: string,
  ) {
    const productIds = items.map((i) => i.productId);
    const shopProducts = await this.prisma.shopProduct.findMany({
      where: {
        shopId,
        productId: { in: productIds },
        isVisible: true,
        isInStock: true,
        stockQuantity: { gt: 0 },
        product: { isActive: true },
      },
    });

    const byProduct = new Map(shopProducts.map((sp) => [sp.productId, sp]));
    const linePricings: FulfillmentPlan['linePricings'] = [];

    for (const item of items) {
      if (item.quantity < 1) {
        throw new BadRequestException('quantity must be >= 1');
      }
      const sp = byProduct.get(item.productId);
      if (!sp) {
        throw new BadRequestException(
          `Product ${item.productId} unavailable at shop ${shopId}`,
        );
      }
      const available = await this.stock.availableQty(sp.id, {
        excludeCustomerId: customerId,
      });
      if (item.quantity > available) {
        throw new BadRequestException(
          `Product ${item.productId} insufficient stock at shop ${shopId}`,
        );
      }
      const unitPrice = sp.discountPrice ?? sp.price;
      linePricings.push({
        productId: item.productId,
        shopProductId: sp.id,
        quantity: item.quantity,
        unitPrice,
      });
    }

    return linePricings;
  }
}
