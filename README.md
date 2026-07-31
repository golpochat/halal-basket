# Halal Basket

Halal grocery delivery and pickup platform (monorepo).

## Sources of truth

- [`halal-basket-blueprint.md`](./halal-basket-blueprint.md) — schema, APIs, engines, UI architecture
- [`halal-basket-absolute-roadmap.md`](./halal-basket-absolute-roadmap.md) — phased delivery

**System status:** Phases A–F complete — see [`SYSTEM-COMPLETE.md`](./SYSTEM-COMPLETE.md). Phase G (scale) is optional.

## Stack

- Backend: NestJS + Prisma + PostgreSQL + JWT
- Frontends: three Vite + React + TypeScript + Tailwind apps (customer, shop, driver)
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
npm run dev:customer   # :5173 catalogue-first customer + admin
npm run dev:shop       # :5174 shop portal
npm run dev:driver     # :5175 driver app
```

- API: `http://localhost:3000` (`GET /health`)
- Customer: `http://localhost:5173/catalogue`
- Shop: `http://localhost:5174`
- Driver: `http://localhost:5175`

### Seeded accounts (password `HalalBasket123!` / `SEED_PASSWORD`)

| Role | Email | App |
|------|-------|-----|
| Super admin | `superadmin@halalbasket.ie` | Customer `:5173` → `/super-admin` |
| Ops admin | `admin@halalbasket.ie` | Customer `:5173` → `/admin` |
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
| Shared types | `shared/` | — |

(`frontend/` is retired — see its README.)

## Customer routes

| Path | Purpose |
|------|---------|
| `/` → `/catalogue` | Homepage catalogue |
| `/help`, `/login`, `/register` | Help & auth |
| `/checkout`, `/orders` | Ordering |
| `/admin`, `/super-admin` | Ops / platform (temporary home) |

## Key APIs

- `POST /auth/register-customer`, `POST /auth/login`
- `GET /shops`, `GET /shops/:shopId/products`
- `POST /orders`, shop-portal + driver portals
- `GET|POST /admin/*` with `admin` / `super_admin` RBAC
