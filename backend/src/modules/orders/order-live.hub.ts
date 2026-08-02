import { Injectable } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

export type OrderLiveSnapshot = {
  id: string;
  status: string;
  paymentStatus?: string;
  fulfillmentMode: string;
  updatedAt?: string | Date;
  polledAt: string;
  fulfillmentCount: number;
  splitOrder: boolean;
  fulfillments: Array<{
    id: string;
    part: number;
    partsTotal: number;
    shopId: string;
    shopName?: string;
    shopAddress?: string | null;
    status: string;
    deliveryDate: string | Date | null;
    estimatedDeliveryAt: string | Date | null;
  }>;
};

type HubEvent = { orderId: string; snapshot: OrderLiveSnapshot };

/**
 * In-memory live status fan-out (single process / pilot).
 * Multi-instance deploys should replace with Redis pub/sub later.
 */
@Injectable()
export class OrderLiveHub {
  private readonly bus = new Subject<HubEvent>();

  publish(orderId: string, snapshot: OrderLiveSnapshot) {
    this.bus.next({ orderId, snapshot });
  }

  watch(orderId: string): Observable<OrderLiveSnapshot> {
    return this.bus.pipe(
      filter((e) => e.orderId === orderId),
      map((e) => e.snapshot),
    );
  }
}
