# Halal Basket

Halal grocery delivery and pickup platform (monorepo).

## Sources of truth

- [`halal-basket-blueprint.md`](./halal-basket-blueprint.md) — schema, APIs, engines, UI architecture
- [`halal-basket-absolute-roadmap.md`](./halal-basket-absolute-roadmap.md) — phased delivery (A–F)
- [`SYSTEM-COMPLETE.md`](./SYSTEM-COMPLETE.md) — completion status + **what’s next**

**System status:** Phases A–F complete. Post-roadmap work and Phase G (scale) are tracked in `SYSTEM-COMPLETE.md`.

## Stack

- Backend: NestJS + Prisma + PostgreSQL + JWT
- Frontends: four Vite + React + TypeScript + Tailwind apps (customer, shop, driver, admin)
- Monorepo: npm workspaces

## Prerequisites

- Node.js 20+
- Docker Desktop (Postgres)

## Quick start

```bash
# 1. Start Postgres (host port 5433 — avoids local Postgres on 5432)
docker compose up -d

# 2. Install dependencies
npm install

# 3. Configure backend env
cp .env.example backend/.env

# 4. Migrate + seed
npm run db:generate
npm run db:migrate
npm run db:seed

# 5. Run API + apps you need
npm run dev:backend
npm run dev:customer   # :5173 catalogue + customer account
npm run dev:shop       # :5174 shop portal
npm run dev:driver     # :5175 driver app
npm run dev:admin      # :5176 ops + platform admin
```

- API: `http://localhost:3000` (`GET /health`)
- Customer: `http://localhost:5173/catalogue`
- Shop: `http://localhost:5174`
- Driver: `http://localhost:5175`
- Admin: `http://localhost:5176`

### Seeded accounts (password `HalalBasket123!` / `SEED_PASSWORD`)

| Role | Email | App |
|------|-------|-----|
| Super admin | `superadmin@halalbasket.ie` | Admin `:5176` → `/super-admin` |
| Ops admin | `admin@halalbasket.ie` | Admin `:5176` → `/admin` |
| Shop | `shop@halalbasket.ie` | Shop `:5174` |
| Driver | `driver@halalbasket.ie` | Driver `:5175` |

Customers register at `/register` on the customer app.

See [`docs/seed-credentials.md`](./docs/seed-credentials.md) and [`docs/pilot-onboarding.md`](./docs/pilot-onboarding.md).

## Workspaces

| Package | Path | Port |
|---------|------|------|
| API | `backend/` | 3000 |
| Customer | `frontend-customer/` | 5173 |
| Shop | `frontend-shop/` | 5174 |
| Driver | `frontend-driver/` | 5175 |
| Admin | `frontend-admin/` | 5176 |
| Shared types / UI | `shared/` | — |

(`frontend/` is retired — see its README.)

## Customer routes

| Path | Purpose |
|------|---------|
| `/` → `/catalogue` | Homepage catalogue |
| `/help`, `/login`, `/register` | Help & auth |
| `/checkout`, `/orders` | Ordering |
| `/legal/:slug` | Published policies (privacy, terms, cookies, refunds) |
| `/delivery-locations`, `/delivery-charges` | Public calendar & fees |

Staff ops and platform settings live on the **admin app** (`:5176`), not the customer app.

## Key APIs

- `POST /auth/register-customer`, `POST /auth/login`
- `GET /shops`, `GET /shops/:shopId/products`
- `POST /orders`, shop-portal + driver portals
- `GET|POST /admin/*` with role + permission RBAC
- `GET /platform/legal`, `GET /platform/legal/:slug`
