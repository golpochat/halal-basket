import { useQuery } from '@tanstack/react-query';
import { queryKeys, type createApiClient } from './client';
import type { CalendarRow, Shop, ShopProduct } from '../types';

type Api = ReturnType<typeof createApiClient>;

export function useShopsQuery(api: Api) {
  return useQuery({
    queryKey: queryKeys.shops,
    queryFn: () => api<Shop[]>('/shops'),
  });
}

export function useShopProductsQuery(
  api: Api,
  shopId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.shopProducts(shopId),
    queryFn: () => api<ShopProduct[]>(`/shops/${shopId}/products`),
    enabled: Boolean(shopId) && enabled,
  });
}

/** Brand catalogue: aggregated across shops; optional area scopes stock. */
export function usePlatformCatalogueQuery(
  api: Api,
  area?: string,
  enabled = true,
) {
  const areaKey = area?.trim() || undefined;
  return useQuery({
    queryKey: queryKeys.platformCatalogue(areaKey),
    queryFn: () => {
      const q = areaKey ? `?area=${encodeURIComponent(areaKey)}` : '';
      return api<ShopProduct[]>(`/platform/catalogue${q}`);
    },
    enabled,
  });
}

export function useDeliveryCalendarQuery(api: Api) {
  return useQuery({
    queryKey: queryKeys.deliveryCalendar,
    queryFn: () => api<CalendarRow[]>('/delivery-calendar'),
  });
}

export function useFeaturesQuery(api: Api) {
  return useQuery({
    queryKey: queryKeys.features,
    queryFn: () =>
      api<{ realtimeDelivery: boolean; multiShop: boolean }>('/features'),
  });
}

export function useBrandingQuery(api: Api) {
  return useQuery({
    queryKey: ['platform', 'branding'] as const,
    queryFn: () =>
      api<{ heroBackgroundUrl: string | null }>('/platform/branding'),
  });
}

export type FeaturedCategory = {
  id: string;
  name: string;
  sortOrder: number;
};

export function useFeaturedCategoriesQuery(api: Api) {
  return useQuery({
    queryKey: queryKeys.featuredCategories,
    queryFn: () =>
      api<{
        categories: FeaturedCategory[];
        minVisible: number;
        maxVisible: number;
      }>('/platform/featured-categories'),
  });
}
