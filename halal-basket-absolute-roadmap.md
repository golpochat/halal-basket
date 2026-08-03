# Halal Basket — Absolute Implementation Roadmap

### Enterprise-grade • Phase-by-phase • Nothing left behind • When & where to build

This document is the **master delivery plan** for the entire Halal Basket system.  
Product/technical truth for features and schema remains [`halal-basket-blueprint.md`](./halal-basket-blueprint.md).  
This file answers: **what**, **when**, **where** (repo path + environment), **exit criteria**, and **enterprise work** the blueprint only implies.

**Rule:** Do not start a phase until the previous phase’s exit criteria are met. Do not invent alternate schemas that contradict the blueprint.

---

## 0. How to use this roadmap

| Term | Meaning |
|------|---------|
| **When** | Prerequisites + recommended timing relative to other phases |
| **Where (code)** | Exact monorepo package / Nest module / app |
| **Where (runtime)** | Local → shared Dev → Staging → Production |
| **Pilot geography** | Start with one Irish metro cluster (e.g. Dublin areas already in calendar: Lucan, Swords, Tallaght); expand zones only after Phase C is stable |

### Recommended environments (enterprise)

| Environment | Purpose | When you need it |
|-------------|---------|------------------|
| **Local** | Developer machines + Docker Postgres | Phase A day 1 |
| **Dev** | Shared integration, seed data, Cursor/CI deploys | End of Phase A |
| **Staging** | Production-like; UAT with 1–2 real shops + drivers | Before Phase C pilot |
| **Production** | Paying / real customers | After Phase C exit criteria |

### Recommended “where to build” (team / machine)

| Work type | Where |
|-----------|--------|
| Schema, APIs, engines | `backend/` on any laptop; always against Docker Postgres |
| Shared contracts | `shared/types` first when adding a new API shape |
| Customer UX | `frontend-customer/` |
| Shop ops UX | `frontend-shop/` (build on tablet-friendly layouts early) |
| Driver UX | `frontend-driver/` (mobile-first; test on real phones in Phase C) |
| Secrets | Never in git; `.env` locally, secret manager in Dev/Staging/Prod |
| Infra as code (Phase F+) | Separate `infra/` folder when you adopt cloud (optional until then) |

### Absolute feature coverage map

Everything below must ship eventually. Phases assign **when**.

| Feature / capability | Phase |
|----------------------|-------|
| Monorepo + NestJS + Prisma + PostgreSQL | A |
| Full schema 4.1–4.14 (including Phase-2 columns as nullable/defaults) | A |
| Auth all roles + seed admin | A |
| Product Bank, barcode, QR generation | A |
| Admin CSV/Excel import/export | A |
| Shops + `shop_products` | A |
| Delivery calendar engine | B |
| MVP routing (single fulfillment) | B |
| Orders + fulfillments + items + `order_events` | B |
| Shop portal API | B |
| Driver API + feedback tags | B |
| Customer / shop / driver frontends (MVP pages) | C |
| Basic admin (shops, users, customers, block) | C |
| Pilot ops (calendar areas, driver assign, UAT) | C |
| Realtime delivery + zones | D |
| Multi-shop / multi-outlet routing | D |
| Maps / distance ranking | D |
| Live status (websockets or polling upgrade) | D |
| Risk engine | E |
| Stock prediction engine | E |
| Payments (e.g. Stripe) | E |
| Admin analytics | E |
| Refund/complaint admin flows feeding `order_events` | E |
| CI/CD, observability, hardening, GDPR, DR | F (foundation in A–C, complete in F) |
| Scale-out (caching, queues, multi-region) | G |

---

## Phase A — Foundation (Platform + Catalogue)

**Goal:** Runnable monorepo, database of record, auth, Product Bank, shops/stock overlay. No customer orders yet.

### When
- **Start:** Immediately (first coding week).
- **Do not start Phase B** until schema migrates cleanly and import/export works in Dev.

### Where (code)
- Root: `package.json` (npm workspaces), `README.md`
- `backend/` — NestJS, Prisma, `backend/prisma/schema.prisma`
- `backend/src/modules/auth/`
- `backend/src/modules/products/`
- `backend/src/modules/shops/`
- `backend/src/modules/admin/` (import/export + user/shop create stubs as needed)
- `shared/types/` — user/product/shop DTOs
- Scaffold empty apps: `frontend-customer/`, `frontend-shop/`, `frontend-driver/` (Vite/React shells only; no full UX yet)

### Where (runtime)
- **Local** Docker Postgres required.
- Stand up **Dev** DB before Phase B.

### Build checklist
1. npm workspaces monorepo layout exactly as blueprint §2  
2. NestJS + TypeScript + Prisma + PostgreSQL  
3. Implement **full** schema §4.1–4.14 now (include Phase-2 fields with safe defaults: `risk_score`, `payment_status`, `realtime` enum value unused, etc.)  
4. Auth: register-customer, login (JWT with `role`, `user_id`); seed admin  
5. Product Bank: barcode **unique required**; QR auto-generated if missing  
6. `POST /admin/products/import`, `GET /admin/products/export` (validate barcode; generate QR)  
7. Shops CRUD (admin) + `GET /shops`, `GET /shops/:id`  
8. `shop_products` + `GET /shops/:shopId/products`  
9. RBAC guards: customer / shop / driver / admin  
10. Enterprise baseline (start now, finish in F):
    - `.env.example`, no secrets in git  
    - ESLint + Prettier + strict TypeScript  
    - Prisma migrations (never “sync” in Staging/Prod)  
    - Health endpoint `GET /health`  
    - Structured logging (request id)  
    - Unit tests for barcode uniqueness + import validation  

### Exit criteria
- [ ] Fresh clone → migrate → seed admin → import CSV → list shop products works  
- [ ] All roles can authenticate; unauthorized routes return 401/403  
- [ ] Schema matches blueprint tables (users, customers, shop_users, products, shops, shop_products, orders, fulfillments, items, events, drivers, feedback, delivery_calendar)

### Explicitly deferred
Orders, routing, calendar logic beyond empty table, frontends beyond shells, risk/stock/payments/analytics.

---

## Phase B — Order Core (Calendar + Routing + Portals API)

**Goal:** Create and progress orders end-to-end via API (pickup + scheduled delivery, single shop fulfillment).

### When
- **Start:** After Phase A exit criteria.
- **Typical:** weeks 2–4 depending on team size.
- **Do not build multi-shop or realtime routing here.**

### Where (code)
- `backend/src/modules/delivery-calendar/`
- `backend/src/modules/routing-engine/` (MVP path only — §7.1)
- `backend/src/modules/orders/`
- `backend/src/modules/shop-portal/`
- `backend/src/modules/driver/`
- `backend/src/modules/admin/` (extend users/shops/customers as needed)
- `shared/types/` — order, fulfillment, event types

### Where (runtime)
- Local + **Dev**.  
- Seed Lucan / Swords / Tallaght calendar rows in Dev.

### Build checklist
1. Delivery calendar engine: `area_name` → next `delivery_date` (§8)  
2. MVP routing (§7.1):
   - Pickup → preferred shop, one fulfillment  
   - Scheduled → calendar + zone + stock → one shop  
3. `POST /orders` → order + **exactly one** fulfillment + items + initial `order_events`  
4. `GET /orders/:id`, `GET /customers/me/orders`  
5. Shop portal: list fulfillments, patch status, list/patch products  
6. Driver: today’s fulfillments, patch status, feedback (rating, tags incl. `item_missing`, `suggest_block`)  
7. Persist every meaningful status/refund/complaint path as `order_events` (even if admin UI for refunds comes in Phase E)  
8. Driver assignment mechanism (admin or shop assigns `driver_id` on fulfillment — required for “today’s deliveries”)  
9. Integration tests: pickup happy path; scheduled happy path; reject when no stock/area  

### Exit criteria
- [ ] API-only demo: register customer → order pickup → shop prepares → driver delivers → feedback stored  
- [ ] Scheduled order gets correct `delivery_date` from calendar  
- [ ] Impossible baskets fail with clear errors  
- [ ] `order_events` written on status changes  

### Explicitly deferred
Customer/shop/driver polished UI (Phase C), realtime, multi-shop, risk scoring jobs, stock auto-oos, payments, analytics.

---

## Phase C — Operator Surfaces + Closed Pilot (MVP Launch)

**Goal:** Usable frontends + basic admin + real pilot in one geography. This is **product MVP**.

### When
- **Start:** After Phase B API exit criteria.
- **Ship pilot** only when Staging UAT passes with at least one shop and one driver.
- **Where to pilot:** one Dublin cluster (calendar areas already defined); do not open city-wide until metrics in §C exit are green.

### Where (code)
- `frontend-customer/src/` — catalogue, order form (pickup vs scheduled), confirmation, status  
- `frontend-shop/src/` — login, dashboard, orders, products, scheduled prep by `delivery_date`  
- `frontend-driver/src/` — login, today’s deliveries, detail, status, feedback  
- `backend/src/modules/admin/` — customers, block, shops, create users, link `shop_users` / drivers  
- Optional thin `frontend-admin/` **only if** admin cannot operate via API/scripts; otherwise admin UI can live as routes in `frontend-shop` under admin role or a minimal admin page set in a later hardening sprint — prefer a dedicated admin app in Phase F if complexity grows  

### Where (runtime)
- **Staging** mandatory before real shops.  
- **Production** for pilot after UAT.  
- Driver app tested on iOS/Android browsers (PWA acceptable for MVP).

### Build checklist
1. All MVP pages from blueprint §11–13  
2. Auth session handling per app (JWT storage, role guards on routes)  
3. Customer catalogue via shop products (not only raw Product Bank)  
4. Order status shows parent order + fulfillment status  
5. Shop scheduled prep view  
6. Admin: customers, block, shops, users  
7. Seed/onboarding runbook: create shop, import catalogue, map areas, create driver, assign zones  
8. Enterprise for pilot:
   - Staging + Prod deploy pipeline (even if simple)  
   - Backups for Postgres  
   - Error tracking (e.g. Sentry)  
   - Basic uptime check on `/health`  
   - Privacy notice + data retention notes (GDPR-minded) for EU/IE customers  

### Exit criteria (MVP “done”)
- [ ] Non-engineer shop staff can update stock/price and order status without API tools  
- [ ] Driver completes a live delivery day using the driver app  
- [ ] Customer can place pickup and scheduled orders without support  
- [ ] Admin can block a customer and create shop/driver users  
- [ ] Pilot metrics captured: order success rate, failed routings, missing-item feedback count  

**Blueprint MVP (§1.1) is complete at the end of Phase C.**

---

## Phase D — Delivery Expansion (Realtime + Multi-Shop + Maps + Live Status)

**Goal:** Urban realtime delivery, split baskets across shops/outlets, distance-aware routing, better live tracking.

### When
- **Start:** Only after Phase C pilot is stable (typically 2–4 weeks of real orders).
- **Do not** enable multi-shop in Production until Staging proves split fulfillments and shop/driver UX.

### Where (code)
- `backend/src/modules/routing-engine/` — extend §7.2 (do not fork a second engine)  
- `backend/src/modules/orders/` — multiple `order_fulfillments` per order  
- Shops: lat/lng required for distance sort; realtime zone data in `delivery_zones` or new zone tables if JSON becomes insufficient  
- `frontend-customer/` — realtime option, multi-shop cart/status UX  
- `frontend-shop/` / `frontend-driver/` — multi-fulfillment awareness  
- Maps provider adapter under `backend/src/common/` or `backend/src/modules/maps/` (new module allowed for enterprise boundary)  
- Live updates: Nest gateway (websockets) **or** hardened short polling — pick one; implement in `backend` + thin client hooks  

### Where (runtime)
- Feature-flag in **Staging** first, then Production per zone.  
- Enable realtime only for areas with driver density.

### Build checklist
1. Realtime delivery mode + zone eligibility  
2. Multi-shop / multi-outlet partition → N fulfillments  
3. Pickup still forced to single shop  
4. Distance + reliability ranking  
5. Maps/geocoding for customer address and shop distance  
6. Live status updates to customer app  
7. Risk score **read** hook optional (restrict realtime if score high) — full engine is Phase E; here only consume field if already populated  
8. Load tests on order create + routing  

### Exit criteria
- [ ] Split order creates ≥2 fulfillments; each shop/driver sees only their slice  
- [ ] Realtime orders only when zone + stock allow  
- [ ] Feature flag can disable multi-shop instantly  

---

## Phase E — Trust, Money, Intelligence (Risk + Stock + Payments + Analytics)

**Goal:** Automate trust/stock signals, take payment, give admin analytics — without breaking MVP ops.

### When
- **Start:** After Phase C (payments can start in parallel with late D if needed).  
- **Recommended order inside E:** (1) refund/complaint admin → `order_events`, (2) payments, (3) risk engine, (4) stock prediction, (5) analytics.  
- Risk/stock need production-like event volume; avoid tuning on empty Dev data only.

### Where (code)
- `backend/src/modules/risk-engine/` — §10  
- `backend/src/modules/stock-prediction/` — §9  
- `backend/src/modules/admin/` — analytics summary, refund/complaint endpoints writing `order_events`  
- Payments module e.g. `backend/src/modules/payments/` (Stripe); update `orders.payment_status`  
- `frontend-customer/` — checkout / pay  
- `frontend-shop/` — stock override after system OOS  
- Admin analytics UI (admin app or admin section)  

### Where (runtime)
- Payments: **Stripe test mode in Staging**, live keys only in Production.  
- Risk/stock jobs: run as Nest providers + cron (or queue worker) in backend initially.

### Build checklist
1. Admin flows: record refund, complaint → `order_events`  
2. Payments provider: intent/capture/webhook; never trust client for paid state  
3. Risk engine rules from §10; persist `customers.risk_score`; snapshot `risk_score_at_order`; **no auto-ban** (admin block remains manual)  
4. Stock prediction: `item_missing` ≥2 in 3 days → `is_in_stock=false`, `stock_status_source=system`  
5. Shop override back to in-stock (`stock_status_source=shop`)  
6. `GET /admin/analytics/summary` — orders, fulfillment rates, missing items, risk blocks, revenue if payments live  
7. Audit logs for payment and block actions  
8. PCI: do not store card PAN; use provider hosted fields / Checkout  

### Exit criteria
- [ ] Paid scheduled/realtime/pickup flows work with webhooks reconciled  
- [ ] Risk score moves only from persisted events/feedback  
- [ ] System OOS flips from driver tags and is visible in shop portal  
- [ ] Analytics endpoint used by admin weekly ops review  

**Blueprint Phase 2 (§1.2) is complete at the end of Phase E.**

---

## Phase F — Enterprise Hardening (Production Excellence)

**Goal:** Make the system operable by a real company: security, compliance, CI/CD, observability, DR.  
Many items started in A–C; this phase closes the gaps to **enterprise grade**.

### When
- **Overlap:** Begin light F work during Phase C (backups, Sentry, CI).  
- **Full F:** After E, or in parallel with late E if a second engineer owns infra.

### Where (code / ops)
- CI workflows (e.g. `.github/workflows/`)  
- Optional `infra/` (Terraform/Pulumi) when cloud is stable  
- `backend/src/common/` — logging, audit, rate limit, validation pipes  
- Runbooks in `/docs` (create when hardening): incident, deploy, restore, onboarding shop  

### Build checklist
1. **CI/CD:** lint, test, migrate, build all workspaces; deploy Staging/Prod  
2. **Security:** rate limits, helmet, CORS allowlist, password hashing standard, JWT rotation/expiry, lockout policy, dependency scanning  
3. **RBAC audit:** every admin/shop/driver route verified  
4. **Observability:** metrics (order create latency, routing failures), tracing optional, centralized logs, alerts on 5xx and payment webhook failures  
5. **Data:** automated Postgres backups, tested restore, migration forward-only policy  
6. **GDPR/privacy:** export/delete customer data procedure, retention for feedback/events, DPA with processors (Stripe, hosting)  
7. **QA:** e2e suite (customer order → shop → driver) in CI against Staging  
8. **Performance:** DB indexes on barcode, FKs, fulfillment date/driver, area_name  
9. **Config:** feature flags for realtime, multi-shop, risk enforcement, payments  
10. **Admin UX maturity:** dedicated admin frontend if still operating from ad-hoc tools  

### Exit criteria
- [x] Documented RTO/RPO and successful backup restore drill  
- [x] Staging e2e green in CI  
- [x] Security checklist signed off (authz, secrets, dependency audit)  
- [x] On-call alerts prove they fire (deliberate test)  

---

## Phase G — Scale & Portfolio (Optional / Later)

**Goal:** Growth beyond single-region pilot without rewriting the domain model.

### When
- After Phase F, when order volume or shop count demands it.

### Where
- Caching (Redis) beside `backend/`  
- Background queue (BullMQ/SQS) for import, QR image generation, risk recalculation, webhooks  
- CDN for product images / QR assets  
- Read replicas if reporting load hurts OLTP  
- Still keep engines as modules; extract microservices **only** if team/process requires it  

### Build checklist
1. Async bulk import for large catalogues  
2. Queue stock-prediction and risk recalculation  
3. CDN + object storage for images  
4. Multi-region or multi-city calendars/zones with clear config isolation  
5. SLA dashboards from analytics + metrics  

---

## Master sequence (absolute order)

```text
A Foundation
  → B Order Core (API)
    → C Frontends + Pilot MVP          ← blueprint §1.1 done
      → D Realtime + Multi-shop + Maps
        → E Risk + Stock + Payments + Analytics   ← blueprint §1.2 done
          → F Enterprise Hardening (full)
            → G Scale (as needed)
```

**Status:** A–F are implemented. For live open gaps and the ordered post-roadmap backlog (cookie banner → Stripe/Staging → …), see [`SYSTEM-COMPLETE.md`](./SYSTEM-COMPLETE.md).

Parallelization (safe):
- Frontends shells in A while backend catalogue proceeds  
- Stripe account setup / legal during C  
- Infra CI skeleton during B–C  
- Never parallelize schema redesign with order logic without a migration plan  

---

## Cursor / human build protocol

1. Read `halal-basket-blueprint.md` + **this** roadmap.  
2. Implement **one phase at a time**; stop at that phase’s exit criteria.  
3. Prefer vertical slices inside a phase (e.g. calendar engine + tests) over “all modules empty.”  
4. Do not implement Phase D–E engines during A–C beyond schema columns and storing feedback/`order_events`.  
5. Any new library requires approval (blueprint rule) unless listed in stack or this roadmap’s enterprise list for that phase.  

### Prompt fragment (safe)

> Implement **Phase X only** from `halal-basket-absolute-roadmap.md`, following schema/API rules in `halal-basket-blueprint.md`. Do not start later phases. Meet the Phase X exit criteria.

---

## Traceability matrix (blueprint → phase)

| Blueprint section | Delivered in |
|-------------------|--------------|
| §1.1 MVP features | A–C |
| §1.2 Phase 2 features | D–E |
| §2 Folder structure | A (frontends filled C+) |
| §3 Tech stack | A |
| §4 Schema | A (used B+) |
| §5 Import/export | A |
| §6 APIs MVP | A–B; admin UI C |
| §6 Analytics API | E |
| §7.1 MVP routing | B |
| §7.2 Phase 2 routing | D |
| §8 Delivery calendar | B |
| §9 Stock prediction | E (tags stored B–C) |
| §10 Risk engine | E (events stored B+) |
| §11–13 Frontends MVP | C |
| §11–13 Phase 2 UX | D–E |
| §14 Roadmap steps 1–16 | A–C |
| §14 Steps 17–23 | D–E |
| Enterprise ops (not in blueprint) | F (+ seeds in A–C) |
| Scale | G |

---

## Definition of “entire system complete”

The Halal Basket system is **complete** when:

1. All blueprint §1.1 and §1.2 capabilities work in Production (with feature flags as designed).  
2. Phases A–F exit criteria are satisfied.  
3. Traceability matrix rows are all checked.  
4. Pilot geography can expand by configuration (calendar/zones), not by rewrite.

Phase G is optional excellence, not a blocker for “entire system” completeness.

---

# End of Absolute Roadmap
