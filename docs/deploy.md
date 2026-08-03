# Deploy runbook

## Stripe test keys — waiting on you

Local/Staging Checkout smoke is **blocked** until Stripe **test** keys are in `backend/.env`:

- `PAYMENT_PROVIDER=stripe`
- `STRIPE_SECRET_KEY=sk_test_…`
- `STRIPE_PUBLISHABLE_KEY=pk_test_…`
- `STRIPE_WEBHOOK_SECRET=whsec_…` (Dashboard endpoint or `stripe listen`)

Then follow **§4–5** (or **§7 Local Stripe test**) below.

---

## Environments

| Env | Purpose |
|-----|---------|
| Local | Docker Postgres `:5433`, API `:3000`, apps `:5173` / `:5174` / `:5175` / `:5176` |
| Staging | Production-like; Stripe **test** mode; UAT with 1–2 shops |
| Production | Pilot / live; Stripe **live** keys only after Staging UAT |

## Deploy steps (API)

1. Set secrets: `DATABASE_URL`, `JWT_SECRET`, `ADMIN_*`, feature flags, `PAYMENT_PROVIDER`, CORS
   - Local CORS: `CORS_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176` (customer / shop / driver / admin)
   - Mock: `PAYMENT_PROVIDER=mock`
   - Stripe: `PAYMENT_PROVIDER=stripe`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `FRONTEND_URL` (Checkout success/cancel). Webhook: `POST /payments/webhook/stripe` for `checkout.session.completed` + `payment_intent.succeeded`.
2. `npm ci`
3. `npx prisma migrate deploy` (forward-only; never `db push` in Staging/Prod)
4. `npm run build -w backend`
5. `npm run start:prod -w backend`
6. Verify `GET /health` and `GET /health/metrics`

## Frontends

Build each app with `VITE_API_URL` pointing at the API origin; deploy static `dist/` behind CDN or host.

```bash
# example Staging builds
VITE_API_URL=https://api.staging.example.com npm run build -w frontend-customer
VITE_API_URL=https://api.staging.example.com npm run build -w frontend-shop
VITE_API_URL=https://api.staging.example.com npm run build -w frontend-driver
VITE_API_URL=https://api.staging.example.com npm run build -w frontend-admin
```

Set Staging `CORS_ORIGINS` to the **four** frontend origins (comma-separated). Set `FRONTEND_URL` to the **customer** origin (Stripe Checkout return URLs).

## Staging cutover checklist

Do this before a real shop UAT. Prefer any host (Railway, Fly, Render, VPS); the checklist is host-agnostic.

### 1. Infrastructure

- [ ] Postgres 16+ with a dedicated Staging database (not local Docker volume)
- [ ] API process with `NODE_ENV=production`, `PORT` as required by host
- [ ] Three–four static frontend hosts (or paths) for customer / shop / driver / **admin**
- [ ] Secrets stored in the host secret manager (never commit `.env`)

### 2. API env (Staging)

| Variable | Staging value |
|----------|----------------|
| `DATABASE_URL` | Staging Postgres URL |
| `JWT_SECRET` | Long random (≠ local) |
| `SEED_PASSWORD` | Strong; only if you seed Staging |
| `CORS_ORIGINS` | Customer + shop + driver + **admin** HTTPS origins |
| `FRONTEND_URL` | Customer HTTPS origin |
| `PAYMENT_PROVIDER` | `stripe` |
| `STRIPE_SECRET_KEY` | `sk_test_…` |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_…` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` from Stripe Staging endpoint |
| `FEATURE_REALTIME_DELIVERY` | `false` until Staging UAT for realtime (local may use `true`) |
| `FEATURE_MULTI_SHOP` | `false` until split orders proven (keep off in Staging/Prod) |
| `REALTIME_ETA_MINUTES` | `60` (optional; used when realtime is on) |
| `REALTIME_MAX_RISK_SCORE` | `50` (0 disables risk gate) |

### 3. Migrate + boot

```bash
npm ci
npm run build -w shared
cd backend && npx prisma migrate deploy
# optional: npx prisma db seed   # Staging only, never Prod with demo passwords
npm run build -w backend
npm run start:prod -w backend
curl -sS "$API/health"
curl -sS "$API/payments/config"   # expect {"provider":"stripe","publishableKey":"pk_test_…"}
```

### 4. Stripe Dashboard (test mode)

1. Developers → API keys → copy **test** publishable + secret into Staging secrets
2. Developers → Webhooks → Add endpoint:
   - URL: `https://<api-host>/payments/webhook/stripe`
   - Events: `checkout.session.completed`, `payment_intent.succeeded`
3. Copy signing secret → `STRIPE_WEBHOOK_SECRET`
4. Restart API after secret change

### 5. Payment smoke (Staging)

1. Register customer on Staging customer URL
2. Place a small pickup/scheduled order (total ≥ €0.50)
3. Confirmation → **Pay now** → redirects to Stripe Checkout
4. Pay with test card `4242 4242 4242 4242` (any future expiry, any CVC)
5. Land on confirmation `?paid=1`
6. Confirm order `paymentStatus=paid` (ops lookup or `GET /admin/orders/:id`)
7. In Stripe Dashboard → Payments: session succeeded; webhook deliveries **2xx**

### 6. Role UAT on Staging

- [ ] Shop login → see fulfillment → assign driver
- [ ] Driver login → today list → advance status
- [ ] Ops `/admin` → order lookup shows totals / coupon / paid

### 7. Local Stripe test (optional, before Staging host)

Use when API runs on `:3000` and you have test keys in `backend/.env`:

```bash
# backend/.env
PAYMENT_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_test_…
STRIPE_PUBLISHABLE_KEY=pk_test_…
FRONTEND_URL=http://localhost:5173
# leave STRIPE_WEBHOOK_SECRET empty until CLI provides one

# terminal A — restart API after env change
npm run dev:backend

# terminal B — forward webhooks
stripe listen --forward-to localhost:3000/payments/webhook/stripe
# paste printed whsec_… into STRIPE_WEBHOOK_SECRET and restart API
```

Then repeat payment smoke on `http://localhost:5173`.

After Checkout, success URL calls `POST /payments/orders/:id/confirm-stripe` (verifies the session with Stripe) so the order marks **paid** even without webhooks. Keep webhooks for Staging/Prod reliability.

## Phase D flags (realtime / multi-shop / live)

| Variable | Safe default | When to enable |
|----------|--------------|----------------|
| `FEATURE_REALTIME_DELIVERY` | `false` | After zone + stock + risk smoke (see [pilot-onboarding.md](./pilot-onboarding.md) § Phase D) |
| `FEATURE_MULTI_SHOP` | `false` | Only after split UAT; **never** enable in Production until proven |
| `REALTIME_ETA_MINUTES` | `60` | Ops tune without code change |
| `REALTIME_MAX_RISK_SCORE` | `50` | Reject realtime when customer `riskScore` ≥ value (`0` = off) |

Live order status for customers is **HTTP polling** (`GET /orders/:id/live`, ~5s). WebSockets / Nest gateway are **not** required for Phase D exit criteria.

`GET /features` exposes the flag snapshot (`realtimeDelivery`, `multiShop`, `realtimeEtaMinutes`, `realtimeMaxRiskScore`) for checkout UI.

## Rollback

1. Redeploy previous image/commit
2. Do **not** reverse migrations unless a dedicated down migration is prepared and reviewed
3. Payments: set `PAYMENT_PROVIDER=mock` only as emergency local/dev fallback — never in Production with real orders unpaid expectation mismatch
4. Phase D: set `FEATURE_REALTIME_DELIVERY=false` and/or `FEATURE_MULTI_SHOP=false` and restart — splits and realtime disable immediately

## Related

- Pilot dry-run + Phase D smokes: [pilot-onboarding.md](./pilot-onboarding.md)
- Incidents / payment alerts: [incident.md](./incident.md)
- Seed accounts (local/Staging seed only): [seed-credentials.md](./seed-credentials.md)
