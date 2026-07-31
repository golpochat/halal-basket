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

## Seeded accounts

See **[seed-credentials.md](./seed-credentials.md)** for emails, password, and login URLs.

Password: `SEED_PASSWORD` (default `HalalBasket123!`)

| Role | Email | App |
|------|-------|-----|
| Super admin | `superadmin@halalbasket.ie` | Customer app → `/super-admin` |
| Ops admin | `admin@halalbasket.ie` | Customer app → `/admin` |
| Shop | `shop@halalbasket.ie` | Shop app `:5174` |
| Driver | `driver@halalbasket.ie` | Driver app `:5175` |

Demo shop + sample products are seeded automatically.

## Onboard another shop

1. Sign in as super-admin → **Platform**
2. Create shop, import CSV (`backend/samples/products.sample.csv`), create shop/driver users
3. Or API: `POST /admin/shops`, `POST /admin/products/import?shopId=...`, `POST /admin/users`

## Daily pilot flow

1. Customer (`http://localhost:5173/catalogue`) — register → browse → checkout
2. Shop (`http://localhost:5174/`) — update status, assign driver, prep by date
3. Driver (`http://localhost:5175/`) — today’s list → status → feedback
4. Ops (`http://localhost:5173/admin`) — customers, block, refunds/complaints
5. Platform (`http://localhost:5173/super-admin`) — analytics, users, GDPR erase

## Backups (minimum)

```bash
docker exec halal-basket-postgres pg_dump -U halal halal_basket > backup-$(date +%F).sql
```

Restore drill before production pilot.
