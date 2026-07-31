# Seeded users & login credentials

**Shared password:** `HalalBasket123!`  
(Override with env `SEED_PASSWORD` before running `npm run db:seed`.)

These accounts come from `backend/prisma/seed.ts`. Re-seed to reset passwords/roles.

| Role | Email | Password | App / Login URL | Lands on after login |
|------|-------|----------|-----------------|----------------------|
| Super admin | `superadmin@halalbasket.ie` | `HalalBasket123!` | http://localhost:5173/login | http://localhost:5173/super-admin |
| Ops admin | `admin@halalbasket.ie` | `HalalBasket123!` | http://localhost:5173/login | http://localhost:5173/admin |
| Shop | `shop@halalbasket.ie` | `HalalBasket123!` | http://localhost:5174/login | http://localhost:5174/ |
| Driver | `driver@halalbasket.ie` | `HalalBasket123!` | http://localhost:5175/login | http://localhost:5175/ |

## Customer accounts

No customer is seeded. Register at:

- http://localhost:5173/register  
- Or browse the catalogue: http://localhost:5173/  

Then sign in at http://localhost:5173/login (lands on http://localhost:5173/).

## Quick links

| Surface | URL | Dev script |
|---------|-----|------------|
| Customer catalogue (home) | http://localhost:5173/ | `npm run dev:customer` |
| Customer login / register | http://localhost:5173/login · /register | `npm run dev:customer` |
| Help | http://localhost:5173/help | `npm run dev:customer` |
| Ops admin | http://localhost:5173/admin | `npm run dev:customer` |
| Platform (super admin) | http://localhost:5173/super-admin | `npm run dev:customer` |
| Shop portal | http://localhost:5174/ | `npm run dev:shop` |
| Driver app | http://localhost:5175/ | `npm run dev:driver` |
| API | http://localhost:3000 | `npm run dev:backend` |

## Notes

- Three frontends: customer **5173**, shop **5174**, driver **5175**; API default **http://localhost:3000**.
- Do **not** use these passwords in production.
- Demo shop is linked to `shop@halalbasket.ie` (id `00000000-0000-4000-8000-000000000001`).
