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

export function useShopProductsQuery(api: Api, shopId: string) {
  return useQuery({
    queryKey: queryKeys.shopProducts(shopId),
    queryFn: () => api<ShopProduct[]>(`/shops/${shopId}/products`),
    enabled: Boolean(shopId),
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
