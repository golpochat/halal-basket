export type UserRole =
  | 'customer'
  | 'shop'
  | 'driver'
  | 'admin'
  | 'super_admin';

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole | string;
  avatarUrl?: string | null;
};

export type StaffRoleSummary = {
  id: string;
  name: string;
  slug: string;
};

export type AuthSession = {
  accessToken: string;
  user: AuthUser;
  /** Staff RBAC permission keys (admin / super_admin). */
  permissions?: string[];
  staffRole?: StaffRoleSummary | null;
};

export type Shop = {
  id: string;
  name: string;
  address?: string | null;
};

export type ProductCategory = {
  id: string;
  name: string;
  slug: string;
};

export type ShopProduct = {
  id: string;
  productId: string;
  price: string | number;
  discountPrice: string | number | null;
  isInStock: boolean;
  product: {
    id: string;
    name: string;
    description: string | null;
    imageUrl?: string | null;
    category: ProductCategory | null;
  };
};

export type CalendarRow = {
  id: string;
  areaName: string;
  deliveryDay: string;
};

export type StockLevel = 'in_stock' | 'low_stock' | 'out_of_stock';

export type DeliveryTypeFilter = 'any' | 'scheduled' | 'realtime' | 'pickup';

export type CatalogueFilters = {
  priceMin: number | null;
  priceMax: number | null;
  inStockOnly: boolean;
  deliveryType: DeliveryTypeFilter;
};
