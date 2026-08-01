# Seeded users & login credentials

**Shared password:** `HalalBasket123!`  
(Override with env `SEED_PASSWORD` before running `npm run db:seed`.)

These accounts come from `backend/prisma/seed.ts`. Re-seed to reset passwords/roles.

| Role | Email | Password | App / Login URL | Lands on after login |
|------|-------|----------|-----------------|----------------------|
| Super admin | `superadmin@halalbasket.ie` | `HalalBasket123!` | http://localhost:5176/login | http://localhost:5176/super-admin/dashboard |
| Ops admin | `admin@halalbasket.ie` | `HalalBasket123!` | http://localhost:5176/login | http://localhost:5176/admin/dashboard |
| Shop | `shop@halalbasket.ie` | `HalalBasket123!` | http://localhost:5174/login | http://localhost:5174/shop/dashboard |
| Driver | `driver@halalbasket.ie` | `HalalBasket123!` | http://localhost:5175/login | http://localhost:5175/driver/dashboard |

Signing in on the customer app (`:5173`) as shop/driver/admin hands off to the matching portal when `VITE_*_URL` env vars are set. Customers land on `/customer/dashboard`.

## Customer accounts

No customer is seeded. Register at:

- http://localhost:5173/register  
- Or browse the catalogue: http://localhost:5173/  

Then sign in at http://localhost:5173/login (lands on http://localhost:5173/customer/dashboard). Catalogue remains at `/`.

## Quick links

| Surface | URL | Dev script |
|---------|-----|------------|
| Customer catalogue | http://localhost:5173/ | `npm run dev:customer` |
| Customer dashboard | http://localhost:5173/customer/dashboard | `npm run dev:customer` |
| Admin dashboard | http://localhost:5176/admin/dashboard | `npm run dev:admin` |
| Super-admin dashboard | http://localhost:5176/super-admin/dashboard | `npm run dev:admin` |
| Shop dashboard | http://localhost:5174/shop/dashboard | `npm run dev:shop` |
| Driver dashboard | http://localhost:5175/driver/dashboard | `npm run dev:driver` |
| API | http://localhost:3000 | `npm run dev:backend` |

## Notes

- Four frontends: customer **5173**, shop **5174**, driver **5175**, admin **5176**.
- Same dashboard layout everywhere (header · sidebar · content · footer) with **separated themes**.
- Do **not** use these passwords in production.
