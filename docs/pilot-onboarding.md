# Pilot onboarding runbook

## Prerequisites

1. `docker compose up -d` (Postgres on host port **5433**)
2. `npm install`
3. `cp .env.example backend/.env` (adjust secrets)
4. `npm run db:generate && npm run db:migrate && npm run db:seed`
5. `npm run dev:backend` and `npm run dev:web`

## Seeded accounts

Password: `SEED_PASSWORD` (default `HalalBasket123!`)

| Role | Email | Route |
|------|-------|-------|
| Super admin | `superadmin@halalbasket.ie` | `/super-admin` |
| Ops admin | `admin@halalbasket.ie` | `/admin` |
| Shop | `shop@halalbasket.ie` | `/shop` |
| Driver | `driver@halalbasket.ie` | `/driver` |

Demo shop + sample products are seeded automatically.

## Onboard another shop

1. Sign in as super-admin → **Platform**
2. Create shop, import CSV (`backend/samples/products.sample.csv`), create shop/driver users
3. Or API: `POST /admin/shops`, `POST /admin/products/import?shopId=...`, `POST /admin/users`

## Daily pilot flow

1. Customer (`http://localhost:5173/customer`) — register → catalogue → checkout wizard
2. Shop (`/shop`) — update status, assign driver from dropdown, prep by date
3. Driver (`/driver`) — today’s list → status → feedback
4. Ops (`/admin`) — customers, block, refunds/complaints
5. Platform (`/super-admin`) — analytics, users, GDPR erase

## Backups (minimum)

```bash
docker exec halal-basket-postgres pg_dump -U halal halal_basket > backup-$(date +%F).sql
```

Restore drill before production pilot.
