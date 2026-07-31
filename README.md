# Halal Basket

Halal grocery delivery and pickup platform (monorepo).

## Sources of truth

- [`halal-basket-blueprint.md`](./halal-basket-blueprint.md) — schema, APIs, engines
- [`halal-basket-absolute-roadmap.md`](./halal-basket-absolute-roadmap.md) — phased delivery

**System status:** Phases A–F complete — see [`SYSTEM-COMPLETE.md`](./SYSTEM-COMPLETE.md). Phase G (scale) is optional.

## Stack

- Backend: NestJS + Prisma + PostgreSQL + JWT
- Frontend: unified React SPA (Vite + TypeScript + Tailwind) with role routes
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

# 5. Run API + web app
npm run dev:backend
npm run dev:web
```

- API: `http://localhost:3000` (`GET /health`)
- Web: `http://localhost:5173`

### Seeded accounts (password `HalalBasket123!` / `SEED_PASSWORD`)

| Role | Email | Home route |
|------|-------|------------|
| Super admin | `superadmin@halalbasket.ie` | `/super-admin` |
| Ops admin | `admin@halalbasket.ie` | `/admin` |
| Shop | `shop@halalbasket.ie` | `/shop` |
| Driver | `driver@halalbasket.ie` | `/driver` |

Customers register at `/customer/register`.

See [`docs/pilot-onboarding.md`](./docs/pilot-onboarding.md).

## Workspaces

| Package | Path |
|---------|------|
| API | `backend/` |
| Unified SPA | `frontend/` |
| Shared types | `shared/` |

## Role routes

| Path | Role |
|------|------|
| `/customer` | Catalogue + ordering |
| `/shop` | Shop portal |
| `/driver` | Driver app |
| `/admin` | Ops (customers, refunds, risk) |
| `/super-admin` | Platform (shops, users, analytics, GDPR) |

## Key APIs

- `POST /auth/register-customer`, `POST /auth/login`
- `GET /shops`, `GET /shops/:shopId/products`
- `POST /orders`, shop-portal + driver portals
- `GET|POST /admin/*` with `admin` / `super_admin` RBAC
