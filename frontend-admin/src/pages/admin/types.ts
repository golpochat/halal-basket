export type Shop = { id: string; name: string };

export type Analytics = {
  orders: {
    total: number;
    completed: number;
    cancelled: number;
    successRate: number;
  };
  payments: { paidOrders: number; revenue: number; refunds: number };
  fulfillments: {
    deliveryRate: number;
    byStatus: Record<string, number>;
  };
  trust: {
    complaints: number;
    blockedCustomers: number;
    missingItemReports: number;
  };
  generatedAt?: string;
};

export type FeaturedAdminItem = {
  id: string;
  categoryId: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
};

export type FeaturedAdminResponse = {
  items: FeaturedAdminItem[];
  available: Array<{ id: string; name: string }>;
  minVisible: number;
  maxVisible: number;
};

export type CurrencyRow = {
  id: string;
  code: string;
  symbol: string;
  name: string;
  exchangeRate: string | number;
  isDefault: boolean;
  isPublished: boolean;
  sortOrder: number;
};

export type LanguageRow = {
  id: string;
  code: string;
  name: string;
  nativeName: string;
  isRtl: boolean;
  isDefault: boolean;
  isPublished: boolean;
  sortOrder: number;
};

export type DeliveryFees = {
  scheduledDeliveryFee: number;
  pickupFee: number;
  freeDeliveryOverAmount: number;
  feesByArea: Record<string, number>;
};

export type CalendarAdminRow = {
  id: string;
  areaName: string;
  deliveryDay: string;
  isActive: boolean;
};

export type WarehouseRow = {
  id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  isActive: boolean;
  deliveryZones: unknown;
  published: boolean;
};

/** @deprecated Prefer WarehouseRow[] from /admin/platform/warehouses */
export type WarehouseAdmin = {
  published: boolean;
  warehouse: {
    id: string;
    name: string;
    address: string | null;
    lat: number | null;
    lng: number | null;
    isActive: boolean;
    deliveryZones: unknown;
  } | null;
};

export type Customer = {
  id: string;
  name: string;
  isBlocked: boolean;
  riskScore: number;
  user: { email: string };
};

export type AdminOrder = {
  id: string;
  status: string;
  fulfillmentMode: string;
  paymentStatus: string;
  subtotalAmount: string | number;
  discountAmount: string | number;
  deliveryFeeAmount: string | number;
  totalAmount: string | number;
  couponCode: string | null;
  deliveryAreaName: string | null;
  customer: { name: string; user: { email: string } };
  fulfillments: Array<{
    id: string;
    status: string;
    shop?: { name: string } | null;
    driver?: { name: string } | null;
  }>;
};

export const WEEKDAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;
