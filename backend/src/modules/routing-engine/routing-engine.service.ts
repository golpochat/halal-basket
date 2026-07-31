import { BadRequestException, Injectable } from '@nestjs/common';
import { FulfillmentMode, Prisma, Shop } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DeliveryCalendarService } from '../delivery-calendar/delivery-calendar.service';
import { FeatureFlagsService } from '../../common/feature-flags.service';
import { LatLng, MapsService } from '../maps/maps.service';

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
  ) {}

  async route(input: {
    fulfillmentMode: FulfillmentMode;
    preferredShopId?: string;
    deliveryAreaName?: string;
    deliveryAddress?: Record<string, unknown>;
    items: RouteLineItem[];
    customerRiskScore?: number;
  }): Promise<RoutingResult> {
    if (!input.items?.length) {
      throw new BadRequestException('Order must include at least one item');
    }

    if (input.fulfillmentMode === FulfillmentMode.pickup) {
      return {
        fulfillmentMode: FulfillmentMode.pickup,
        fulfillments: [
          await this.routePickup(input.preferredShopId, input.items),
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
      });
    }

    throw new BadRequestException('Unsupported fulfillment mode');
  }

  /** @deprecated use route() — kept name for call-site migration */
  routeMvp(input: Parameters<RoutingEngineService['route']>[0]) {
    return this.route(input);
  }

  private async routePickup(
    preferredShopId: string | undefined,
    items: RouteLineItem[],
  ): Promise<FulfillmentPlan> {
    if (!preferredShopId) {
      throw new BadRequestException('preferred_shop_id is required for pickup');
    }
    const shop = await this.prisma.shop.findFirst({
      where: { id: preferredShopId, isActive: true },
    });
    if (!shop) {
      throw new BadRequestException('Preferred shop not found or inactive');
    }

    const linePricings = await this.requireFullStock(shop.id, items);
    return {
      shopId: shop.id,
      deliveryDate: null,
      estimatedDeliveryAt: null,
      linePricings,
    };
  }

  private async routeDeliveryLike(input: {
    mode: FulfillmentMode;
    preferredShopId?: string;
    deliveryAreaName?: string;
    deliveryAddress?: Record<string, unknown>;
    items: RouteLineItem[];
    resolveDate: boolean;
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
      estimatedDeliveryAt = new Date(Date.now() + 60 * 60 * 1000);
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

    const ordered = this.sortByDistance(
      candidates,
      origin,
      input.preferredShopId,
    );

    // Prefer single-shop fulfillment
    for (const shop of ordered) {
      try {
        const linePricings = await this.requireFullStock(shop.id, input.items);
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
    );

    return { fulfillmentMode: input.mode, fulfillments };
  }

  private async partitionMultiShop(
    shops: Shop[],
    items: RouteLineItem[],
    deliveryDate: Date | null,
    estimatedDeliveryAt: Date | null,
  ): Promise<FulfillmentPlan[]> {
    const plans = new Map<string, FulfillmentPlan>();

    for (const item of items) {
      let assigned = false;
      for (const shop of shops) {
        try {
          const [line] = await this.requireFullStock(shop.id, [item]);
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
    const shops = await this.prisma.shop.findMany({
      where: { isActive: true },
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

  private async requireFullStock(shopId: string, items: RouteLineItem[]) {
    const productIds = items.map((i) => i.productId);
    const shopProducts = await this.prisma.shopProduct.findMany({
      where: {
        shopId,
        productId: { in: productIds },
        isVisible: true,
        isInStock: true,
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
