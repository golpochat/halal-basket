export type UserRole =
  | 'customer'
  | 'shop'
  | 'driver'
  | 'admin'
  | 'super_admin';

export type StockStatusSource = 'shop' | 'system' | 'import';

export type FulfillmentMode =
  | 'pickup'
  | 'scheduled_delivery'
  | 'realtime_delivery';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type FulfillmentStatus =
  | 'pending'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed_attempt'
  | 'cancelled';

export type OrderEventType =
  | 'status_change'
  | 'refund'
  | 'complaint'
  | 'note'
  | 'driver_feedback_linked';

export interface AuthUserDto {
  id: string;
  email: string;
  role: UserRole;
}

export interface ProductDto {
  id: string;
  name: string;
  slug: string;
  categoryId: string | null;
  description: string | null;
  imageUrl: string | null;
  tags: unknown;
  isActive: boolean;
  barcode: string;
  qrCode: string;
  qrCodeImageUrl: string | null;
  sku: string | null;
}

export interface ShopDto {
  id: string;
  name: string;
  parentCompanyId: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  openingHours: unknown;
  deliveryZones: unknown;
  lat: number | null;
  lng: number | null;
  isActive: boolean;
}

export interface ShopProductDto {
  id: string;
  shopId: string;
  productId: string;
  price: number;
  discountPrice: number | null;
  isInStock: boolean;
  stockStatusSource: StockStatusSource;
  lastStockUpdateAt: string | null;
  isVisible: boolean;
  product?: ProductDto;
}

export interface CreateOrderItemDto {
  productId: string;
  quantity: number;
}

export interface CustomerAddress {
  id: string;
  /** Predefined label: Home | Work | Family | Other */
  label: string;
  line1: string;
  eircode: string;
  /** Delivery location / area from admin delivery calendar */
  area_name: string;
  isDefault?: boolean;
}

export interface CreateOrderRequestDto {
  fulfillmentMode: FulfillmentMode;
  preferredShopId?: string;
  deliveryAreaName?: string;
  deliveryAddress?: Record<string, unknown>;
  items: CreateOrderItemDto[];
}

export interface OrderItemDto {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  product?: Pick<ProductDto, 'id' | 'name' | 'imageUrl'>;
}

export interface OrderFulfillmentDto {
  id: string;
  orderId: string;
  shopId: string;
  driverId: string | null;
  status: FulfillmentStatus;
  deliveryDate: string | null;
  estimatedDeliveryAt: string | null;
}

export interface OrderEventDto {
  id: string;
  orderId: string;
  fulfillmentId: string | null;
  eventType: OrderEventType;
  payload: unknown;
  createdAt: string;
}

export interface OrderDto {
  id: string;
  customerId: string;
  fulfillmentMode: FulfillmentMode;
  status: OrderStatus;
  totalAmount: number;
  deliveryAreaName: string | null;
  deliveryAddress?: Record<string, unknown> | null;
  paymentStatus: PaymentStatus;
  createdAt?: string;
  items?: OrderItemDto[];
  fulfillments?: OrderFulfillmentDto[];
  events?: OrderEventDto[];
}

