# Seeded users & login credentials

**Shared password:** `HalalBasket123!`  
(Override with env `SEED_PASSWORD` before running `npm run db:seed`.)

Staff accounts come from `backend/prisma/seed.ts`. Re-seed to reset passwords/roles. Customers are not seeded — register once, then use the same password you chose.

| Role        | Email                                      | Password                           | App / Login URL             | Lands on after login                        |
| ----------- | ------------------------------------------ | ---------------------------------- | --------------------------- | ------------------------------------------- |
| Super admin | `superadmin@halalbasket.ie`                | `HalalBasket123!`                  | http://localhost:5176/login | http://localhost:5176/super-admin/dashboard |
| Admin       | `admin@halalbasket.ie`                     | `HalalBasket123!`                  | http://localhost:5176/login | http://localhost:5176/admin/dashboard       |
| Customer    | Register at http://localhost:5173/register | Your chosen password (min 8 chars) | http://localhost:5173/login | http://localhost:5173/customer/dashboard    |
| Shop        | `shop@halalbasket.ie`                      | `HalalBasket123!`                  | http://localhost:5174/login | http://localhost:5174/shop/dashboard        |
| Driver      | `driver@halalbasket.ie`                    | `HalalBasket123!`                  | http://localhost:5175/login | http://localhost:5175/driver/dashboard      |

The customer app (`:5173`) accepts customer accounts only; use each staff portal's login for shop, driver, and admin accounts. Catalogue remains at http://localhost:5173/.

## Quick links

| Surface               | URL                                         | Dev script             |
| --------------------- | ------------------------------------------- | ---------------------- |
| Customer catalogue    | http://localhost:5173/                      | `npm run dev:customer` |
| Customer register     | http://localhost:5173/register              | `npm run dev:customer` |
| Customer dashboard    | http://localhost:5173/customer/dashboard    | `npm run dev:customer` |
| Admin dashboard       | http://localhost:5176/admin/dashboard       | `npm run dev:admin`    |
| Super-admin dashboard | http://localhost:5176/super-admin/dashboard | `npm run dev:admin`    |
| Shop dashboard        | http://localhost:5174/shop/dashboard        | `npm run dev:shop`     |
| Driver dashboard      | http://localhost:5175/driver/dashboard      | `npm run dev:driver`   |
| API                   | http://localhost:3000                       | `npm run dev:backend`  |

## Notes

- Four frontends: customer **5173**, shop **5174**, driver **5175**, admin **5176**.
- Same dashboard layout everywhere (header · sidebar · content · footer) with **separated themes**.
- Do **not** use these passwords in production.
- **RBAC:** Super admin manages roles under **Roles & permissions**, then assigns a staff role on **Admin users**. Seeded system roles: Super admin, Admin (ops + catalogue generalist), Ops agent, Catalogue manager, Marketing, Logistics, Support. Seeded `admin@…` gets **Admin**. Super-admin dashboard highlights platform governance; staff dashboards show only their role’s areas. Re-login after seed to refresh `permissions`. Re-run `npm run prisma:seed` (from `backend/`) to sync role permission sets.
