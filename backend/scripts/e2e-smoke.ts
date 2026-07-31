/**
 * Phase F API e2e smoke (no browser).
 * Run: npm run e2e -w backend
 * Requires API on BASE_URL (default http://localhost:3000) and seeded admin.
 */
const BASE = process.env.BASE_URL ?? 'http://localhost:3000';

async function req(
  path: string,
  init: RequestInit & { token?: string } = {},
) {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (init.token) headers.set('Authorization', `Bearer ${init.token}`);
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(`${init.method ?? 'GET'} ${path} → ${res.status} ${text}`);
  }
  return body;
}

async function main() {
  const health = await req('/health');
  if (health.status !== 'ok') throw new Error('health failed');

  const superAdmin = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: process.env.SUPERADMIN_EMAIL ?? 'superadmin@halalbasket.ie',
      password: process.env.SEED_PASSWORD ?? 'HalalBasket123!',
    }),
  });

  const alert = await req('/admin/ops/test-alert', {
    method: 'POST',
    token: superAdmin.accessToken,
    body: JSON.stringify({ reason: 'e2e-drill' }),
  });
  if (!alert.ok) throw new Error('test alert failed');

  const metrics = await req('/admin/metrics', {
    token: superAdmin.accessToken,
  });
  if (typeof metrics.httpRequests !== 'number') {
    throw new Error('metrics missing');
  }

  let shops = await req('/shops');
  if (!shops.length) {
    const shop = await req('/admin/shops', {
      method: 'POST',
      token: superAdmin.accessToken,
      body: JSON.stringify({
        name: 'E2E Shop',
        deliveryZones: ['Lucan'],
        isActive: true,
      }),
    });
    const fs = await import('fs');
    const path = await import('path');
    const csvPath = path.join(__dirname, '../samples/products.sample.csv');
    if (!fs.existsSync(csvPath)) {
      throw new Error('sample CSV missing');
    }
    const form = new FormData();
    const blob = new Blob([fs.readFileSync(csvPath)], { type: 'text/csv' });
    form.append('file', blob, 'products.sample.csv');
    const res = await fetch(
      `${BASE}/admin/products/import?shopId=${shop.id}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${superAdmin.accessToken}` },
        body: form,
      },
    );
    if (!res.ok) throw new Error(`import failed ${await res.text()}`);
    const prods = await req(`/shops/${shop.id}/products`);
    for (const sp of prods) {
      await req(`/admin/shops/${shop.id}/products`, {
        method: 'POST',
        token: superAdmin.accessToken,
        body: JSON.stringify({
          productId: sp.productId,
          price: 5,
          isInStock: true,
          isVisible: true,
        }),
      });
    }
    shops = await req('/shops');
  }

  const shopId = shops[0].id;
  let products = await req(`/shops/${shopId}/products`);
  if (!products.length) throw new Error('no shop products');

  await req(`/admin/shops/${shopId}/products`, {
    method: 'POST',
    token: superAdmin.accessToken,
    body: JSON.stringify({
      productId: products[0].productId,
      price: 4.5,
      isInStock: true,
      isVisible: true,
    }),
  });
  products = await req(`/shops/${shopId}/products`);

  const email = `e2e_${Date.now()}@example.com`;
  const customer = await req('/auth/register-customer', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password: 'Customer123!',
      name: 'E2E Customer',
    }),
  });

  const order = await req('/orders', {
    method: 'POST',
    token: customer.accessToken,
    body: JSON.stringify({
      fulfillmentMode: 'pickup',
      preferredShopId: shopId,
      items: [{ productId: products[0].productId, quantity: 1 }],
    }),
  });

  const intent = await req(`/payments/orders/${order.id}/intent`, {
    method: 'POST',
    token: customer.accessToken,
  });
  await req(`/payments/orders/${order.id}/confirm-mock`, {
    method: 'POST',
    token: customer.accessToken,
    body: JSON.stringify({ paymentIntentId: intent.paymentIntentId }),
  });

  const shopSession = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: process.env.SHOP_EMAIL ?? 'shop@halalbasket.ie',
      password: process.env.SEED_PASSWORD ?? 'HalalBasket123!',
    }),
  });

  const ff = order.fulfillments[0].id;
  await req(`/shop-portal/orders/${ff}/status`, {
    method: 'PATCH',
    token: shopSession.accessToken,
    body: JSON.stringify({ status: 'preparing' }),
  });
  await req(`/shop-portal/orders/${ff}/status`, {
    method: 'PATCH',
    token: shopSession.accessToken,
    body: JSON.stringify({ status: 'ready' }),
  });

  const summary = await req('/admin/analytics/summary', {
    token: superAdmin.accessToken,
  });

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        ok: true,
        orderId: order.id,
        paid: true,
        analyticsOrders: summary.orders.total,
        metricsHttp: metrics.httpRequests,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
