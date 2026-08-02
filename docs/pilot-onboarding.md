# Pilot onboarding runbook

## Prerequisites

1. `docker compose up -d` (Postgres on host port **5433**)
2. `npm install`
3. `cp .env.example backend/.env` (adjust secrets)
4. `npm run db:generate && npm run db:migrate && npm run db:seed`
5. `npm run dev:backend` plus the frontends you need:
   - `npm run dev:customer` (5173)
   - `npm run dev:shop` (5174)
   - `npm run dev:driver` (5175)
   - `npm run dev:admin` (5176)

## Seeded accounts

See **[seed-credentials.md](./seed-credentials.md)** for emails, password, and login URLs.

Password: `SEED_PASSWORD` (default `HalalBasket123!`)

| Role | Email | App |
|------|-------|-----|
| Super admin | `superadmin@halalbasket.ie` | Admin app `:5176` → `/super-admin/dashboard` |
| Ops admin | `admin@halalbasket.ie` | Admin app `:5176` → `/admin/dashboard` |
| Shop | `shop@halalbasket.ie` | Shop app `:5174` → `/shop/dashboard` |
| Driver | `driver@halalbasket.ie` | Driver app `:5175` → `/driver/dashboard` |

Demo shop + sample products are seeded automatically. No customer is seeded — register at `/register`.

## Pre-pilot dry-run checklist

Run with API + apps up. Tick each item.

### Platform config (super-admin → admin app `/branding`, `/warehouse`, …)

- [x] **Delivery calendar** — Lucan / Swords / Tallaght on `GET /delivery-calendar` (UI: `/delivery-locations`)
- [x] **Delivery fees** — scheduled €3.99, pickup free, area fees on `GET /platform/delivery-config` (UI: `/delivery-charges`)
- [x] **Cart promo & coupons** — promo banner live; `HALAL10` / `WELCOME5` apply on place order (discount on confirmation / ops)
- [x] **Warehouse** — unpublished for pilot (`isPublished` false)

### Customer happy path (`:5173`)

- [x] Register → browse catalogue with area selected (Halal Basket branding only)
- [x] Add items → coupon on checkout → total includes fee/discount (`HALAL10` / `WELCOME5` verified via API)
- [x] Place **pickup** order → confirmation path → appears under My orders (`GET /customers/me/orders`)
- [x] Place **scheduled delivery** (Lucan) → fee €3.99; stock hold TTL until place
- [x] Change area with OOS items → cart flags unavailable; remove before checkout

### Ops / shop / driver

- [x] Shop (`:5174` → Products) exposes **price + stock qty** (`stockQuantity` on portal products)
- [x] Shop (`:5174` → Orders) sees new fulfillments; updates status; **Assign driver**
- [x] Driver (`:5175`) sees assigned active jobs (active pickups + scheduled from today onward)
- [x] Ops (`:5176` → `/admin/ops` or `/super-admin/ops`) order lookup shows subtotal / discount / coupon / delivery / total; refund/complaint path works

### Manual shop → driver tick (2 minutes)

1. Place a customer pickup or scheduled order
2. Shop login → Orders → Assign driver (`driver@halalbasket.ie`)
3. Driver login → confirm the fulfillment appears on today’s list
4. Driver advances status (optional)

**Verified (local API, 2026-08-01):** register → pickup+scheduled → mock pay → shop prepare/ready/assign → driver today → delivered → ops `paid`/`completed`/`HALAL10`.  
**Verified (browser UAT, 2026-08-01):** Lucan cart → switch to Swords → “Unavailable in Swords” + checkout disabled → **Remove unavailable** clears basket; shop / driver / ops logins load dashboards.  
**Fix:** `CORS_ORIGINS` must include `5173,5174,5175` (shop/driver were blocked with “Failed to fetch”). Demo Shop zones restored to Lucan/Swords/Tallaght after OOS test.  
**Note:** deactivated orphan Lucan test shops (PhaseD A/B, Lucan Halal Mart) so routing hits **Halal Basket Demo Shop** for `shop@halalbasket.ie`.

### Payments

- [x] `GET /payments/config` returns provider (`mock` by default)
- [x] Confirmation **Pay now** mock path: intent + `confirm-mock` → `paymentStatus=paid` (Stripe Checkout when `PAYMENT_PROVIDER=stripe`)

### API smoke (optional)

```text
GET  /platform/delivery-config
GET  /platform/promotions
POST /platform/coupons/validate  { "code": "HALAL10", "subtotal": 40 }
GET  /platform/catalogue?area=Lucan
GET  /payments/config
GET  /admin/orders/:id           (auth admin)
GET  /customers/me/orders        (auth customer)
POST /orders/route-preview      (auth customer; include deliveryAreaName)
POST /orders/stock-hold         (auth customer)
POST /orders                    + holdId + optional couponCode
```

**Last full dry-run (local):** platform + customer + mock pay + shop/driver/ops — **OK**.  
**Browser UAT:** OOS area-change + shop/driver/ops logins — **OK**.  
**Second shop:** Swords Halal Market onboarded (`shop2@` / `driver2@`); Swords orders route there; Demo Shop does not see them — **OK**.

### Phase D — realtime, multi-shop, live status

Flags in `backend/.env` (restart API after change). Defaults in [`.env.example`](../.env.example) stay **off** except local pilot may enable realtime.

| Flag / setting | Local Phase D | Notes |
|----------------|---------------|--------|
| `FEATURE_REALTIME_DELIVERY` | `true` (local) | Checkout shows Realtime; zone + stock + `REALTIME_MAX_RISK_SCORE` gate |
| `REALTIME_ETA_MINUTES` | `60` | ETA on fulfillment `estimatedDeliveryAt` (min 15) |
| `FEATURE_MULTI_SHOP` | `false` by default | Set `true` only for split smoke; turn off to reject splits instantly |

**D1 realtime smoke (API):**

1. `GET /features` → `realtimeDelivery: true`, `realtimeEtaMinutes: 60`
2. Register customer → Lucan catalogue → `POST /orders/route-preview` with `fulfillmentMode: realtime_delivery`
3. `POST /orders/stock-hold` → `POST /orders` with `holdId`
4. `GET /orders/:id/live` → mode `realtime_delivery`, ETA ~now+ETA minutes; shop-portal sees fulfillment

**Verified (local API, 2026-08-02):** Lucan realtime → Demo Shop fulfillment + live ETA.

**D2 multi-shop smoke (local only):**

1. `FEATURE_MULTI_SHOP=true`, restart API
2. Stock fixture (Demo rice-only / Swords chicken-only):  
   `node backend/scripts/phase-d2-split-fixture.js apply`
3. Basket rice + chicken, area **Swords** → place scheduled (or realtime) → **≥2 fulfillments**
4. `shop@` sees only Demo slice; `shop2@` sees only Swords slice (`GET /shop-portal/orders`)
5. Set `FEATURE_MULTI_SHOP=false`, restart → same basket → hold/place fails with “enable FEATURE_MULTI_SHOP”
6. Restore stock: `node backend/scripts/phase-d2-split-fixture.js restore`

**Verified (local API, 2026-08-02):** split order (2 parts) + shop isolation + flag-off reject.

**D3 live status:** Customer My orders detail polls `GET /orders/:id/live` every **5s**, pauses when the tab is hidden. Payload includes `status`, `paymentStatus`, `splitOrder`, per-fulfillment `part` / `partsTotal` / ETA. **No WebSockets yet** — polling is the pilot path; Nest gateway is later hardening.

Customer UX: confirmation + orders show “Part N of M” (brand-safe Halal Basket copy, not partner shop names on customer surfaces).

### Reminder — Stripe test keys (blocked)

You said you’ll provide Stripe **test** keys later. Until then, keep `PAYMENT_PROVIDER=mock`.  
When ready: set `sk_test_…` / `pk_test_…` / webhook secret, `PAYMENT_PROVIDER=stripe`, then run the smoke in [deploy.md](./deploy.md) § Staging cutover / Local Stripe test.

**Next env:** Staging + Stripe test — see [deploy.md](./deploy.md) § Staging cutover checklist.

## Onboard another shop

1. Sign in as super-admin → **Platform** (or API below)
2. Create shop with `deliveryZones` (e.g. `["Swords"]`), import CSV (`backend/samples/products.sample.csv`), set stock qty if import left `0`
3. Create shop user (`role=shop` + `shopId`) and driver user (`role=driver`)
4. Or API: `POST /admin/shops`, `POST /admin/products/import?shopId=...`, `POST /admin/users`

**Local second shop already created:** Swords Halal Market · `shop2@halalbasket.ie` / `driver2@halalbasket.ie` (password = `SEED_PASSWORD`).

## Daily pilot flow

1. Customer (`http://localhost:5173/`) — register → browse → checkout
2. Shop (`http://localhost:5174/`) — stock qty, status, assign driver, prep by date
3. Driver (`http://localhost:5175/`) — today’s list → status → feedback
4. Ops (`http://localhost:5176/admin/ops` or `/super-admin/ops`) — customers, block, refunds/complaints
5. Platform (`http://localhost:5176/super-admin/…`) — fees, calendar, promos, warehouse, analytics, GDPR erase

## Backups (minimum)

```bash
docker exec halal-basket-postgres pg_dump -U halalhalal_basket > backup-$(date +%F).sql
```

Restore drill before production pilot.
