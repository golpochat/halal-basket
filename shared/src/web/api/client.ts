export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function createApiClient(baseUrl: string) {
  return async function api<T>(
    path: string,
    options: RequestInit & { token?: string } = {},
  ): Promise<T> {
    const headers = new Headers(options.headers);
    if (!(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    if (options.token) {
      headers.set('Authorization', `Bearer ${options.token}`);
    }

    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let message = res.statusText;
      try {
        const body = (await res.json()) as { message?: string | string[] };
        if (Array.isArray(body.message)) message = body.message.join(', ');
        else if (body.message) message = body.message;
      } catch {
        /* ignore */
      }
      throw new ApiError(res.status, message);
    }

    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  };
}

export const queryKeys = {
  shops: ['shops'] as const,
  shopProducts: (shopId: string) => ['shops', shopId, 'products'] as const,
  platformCatalogue: (area?: string) =>
    ['platform', 'catalogue', area ?? 'all'] as const,
  deliveryCalendar: ['delivery-calendar'] as const,
  features: ['features'] as const,
  platformLocale: ['platform-locale'] as const,
  featuredCategories: ['platform', 'featured-categories'] as const,
  customerOrders: ['customer', 'orders'] as const,
  customerOrder: (id: string) => ['customer', 'orders', id] as const,
  shopPortalOrders: (deliveryDate?: string) =>
    ['shop-portal', 'orders', deliveryDate ?? 'all'] as const,
  shopPortalProducts: ['shop-portal', 'products'] as const,
  shopPortalDrivers: ['shop-portal', 'drivers'] as const,
  driverToday: ['driver', 'orders', 'today'] as const,
};
