# Halal Basket — Complete Implementation Blueprint

### Cursor AI Ready • Phased System • Full Folder Structure • Start-to-Finish Guide

This file defines the Halal Basket platform architecture and implementation order. Build **MVP first**, then Phase 2. Do not implement the entire system in one pass.

---

# 1. Project Overview

Halal Basket is a halal grocery delivery and pickup platform.

## 1.1 MVP (ship first)

- Product Bank (global catalogue) with barcode + auto-generated QR
- Admin bulk import/export (CSV/Excel)
- Shop catalogue via `shop_products`
- Pickup from a specific shop
- Scheduled delivery (area → delivery day calendar)
- Single-shop routing (preferred shop or nearest shop with stock)
- Customer app (catalogue, order, status)
- Shop Portal (orders, stock, price)
- Driver App (today’s deliveries, status, feedback)
- Auth for customer, shop, driver, admin
- Basic admin (shops, customers, block)

## 1.2 Phase 2 (after MVP works)

- Real-time delivery (urban zones)
- Multi-shop / multi-outlet basket routing
- Customer risk scoring
- Stock prediction from driver “item missing” signals
- Admin analytics
- Payments provider integration (e.g. Stripe)
- Maps / distance APIs, websockets for live status (as needed)

---

# 2. Folder Structure (Full Project)

Use an **npm workspaces** monorepo. Shared types live in `shared/types` and are imported by apps.

```
halal-basket/
│
├── package.json                 # workspaces root
├── backend/
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── products/
│   │   │   ├── shops/
│   │   │   ├── orders/
│   │   │   ├── shop-portal/
│   │   │   ├── driver/
│   │   │   ├── admin/
│   │   │   ├── routing-engine/
│   │   │   ├── delivery-calendar/
│   │   │   ├── stock-prediction/    # Phase 2
│   │   │   ├── risk-engine/         # Phase 2
│   │   ├── common/
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   ├── package.json
│   ├── tsconfig.json
│
├── frontend-customer/
│   ├── src/
│   ├── public/
│   ├── package.json
│
├── frontend-shop/
│   ├── src/
│   ├── public/
│   ├── package.json
│
├── frontend-driver/
│   ├── src/
│   ├── public/
│   ├── package.json
│
├── shared/
│   ├── types/
│   ├── utils/
│
└── README.md
```

Generate application code inside these folders only when implementing the current roadmap step.

---

# 3. Tech Stack

## Backend

- Node.js
- TypeScript
- NestJS
- PostgreSQL
- Prisma ORM
- JWT authentication

## Frontend

- React (TypeScript)
- TailwindCSS

## Monorepo

- npm workspaces
- Shared TypeScript types in `shared/types`

---

# 4. Database Schema

Generate this schema in `backend/prisma/schema.prisma`.

## 4.1 users

Shared auth identity for all roles.

- id
- email (unique)
- phone (optional, unique when present)
- password_hash
- role: `customer` | `shop` | `driver` | `admin`
- is_active
- created_at

## 4.2 customers

- id
- user_id (FK → users)
- name
- address_list (JSON) — each address should include `area_name` (for calendar) and optional lat/lng later
- risk_score (default 0; used in Phase 2)
- is_blocked

## 4.3 shop_users

Links shop-role users to one or more shops.

- id
- user_id (FK → users)
- shop_id (FK → shops)

## 4.4 categories

- id
- name
- slug (unique)

## 4.5 products (Product Bank)

Global product identity.

- id
- name
- slug (unique)
- category_id
- description
- image_url
- tags (JSON)
- is_active
- barcode (string, **unique, required**) — primary product identity
- qr_code (string) — payload/URL, **auto-generated** if missing
- qr_code_image_url (string, optional) — generated image path/URL
- sku (string, optional)
- created_at
- updated_at

Rule: barcode is required on create/import. QR is generated from barcode (or product id) when not provided.

## 4.6 shops

- id
- name
- parent_company_id (optional, for multi-outlet groups)
- address
- phone
- email
- opening_hours (JSON)
- delivery_zones (JSON) — area names or zone ids this shop serves
- lat / lng (optional in MVP; needed for distance sort later)
- is_active

## 4.7 shop_products

Shop-specific price and stock overlay on Product Bank.

- id
- shop_id
- product_id
- price
- discount_price (optional)
- is_in_stock
- stock_status_source: `shop` | `system` | `import`
- last_stock_update_at
- is_visible
- unique (shop_id, product_id)

## 4.8 orders

Parent order (customer basket). Does **not** rely on a single `shop_id`.

- id
- customer_id
- fulfillment_mode: `pickup` | `scheduled_delivery` | `realtime_delivery` (realtime = Phase 2)
- status: overall order status (e.g. `pending` | `confirmed` | `in_progress` | `completed` | `cancelled`)
- total_amount
- delivery_address (JSON, null for pickup)
- delivery_area_name (string, for calendar matching)
- preferred_shop_id (optional; used for pickup / MVP routing)
- payment_status: `pending` | `paid` | `failed` | `refunded` (provider integration = Phase 2)
- risk_score_at_order (optional snapshot; Phase 2)
- created_at
- updated_at

## 4.9 order_fulfillments

One row per shop fulfilling part of an order.

- id
- order_id
- shop_id
- driver_id (nullable until assigned)
- status: `pending` | `preparing` | `ready` | `out_for_delivery` | `delivered` | `cancelled`
- delivery_date (nullable for pickup; required for scheduled)
- estimated_delivery_at (optional)
- unique pragmatic rule: MVP always creates **exactly one** fulfillment; Phase 2 may create multiple

## 4.10 order_items

Line items belong to a fulfillment (hence to a shop).

- id
- order_id
- fulfillment_id
- product_id
- shop_product_id
- quantity
- unit_price

## 4.11 order_events

Audit / risk / ops history.

- id
- order_id
- fulfillment_id (optional)
- actor_user_id (optional)
- event_type: `status_change` | `refund` | `complaint` | `note` | `driver_feedback_linked`
- payload (JSON)
- created_at

## 4.12 drivers

- id
- user_id (FK → users)
- name
- phone
- is_active

## 4.13 driver_feedback

- id
- driver_id
- customer_id
- order_id
- fulfillment_id (optional)
- rating (1–5)
- tags (JSON) — e.g. `rude`, `frequent_refunder`, `item_missing`
- suggest_block (boolean)
- created_at

## 4.14 delivery_calendar

Maps service areas to delivery days (MVP scheduled delivery).

- id
- area_name
- delivery_day — weekday enum or string (`monday` … `sunday`)
- is_active
- unique (area_name, delivery_day) if multiple days per area are allowed later

Example rows:

- Lucan → Tuesday
- Swords → Friday
- Tallaght → Wednesday

---

# 5. Bulk Import/Export (Admin Only)

### Endpoints

- `POST /admin/products/import`
- `GET /admin/products/export`

### CSV/Excel fields

- name
- slug
- category
- description
- image_url
- tags
- is_active
- barcode (**required**)
- qr_code (optional — generated if missing)
- sku (optional)

### Logic

- Parse CSV/Excel
- Validate required fields (including barcode uniqueness)
- Generate `qr_code` (+ optional image) if missing
- Upsert Product Bank by barcode (or slug)
- Optionally create/update `shop_products` when a shop_id is provided in the import job

---

# 6. Backend API

Mark Phase 2 endpoints; implement MVP endpoints first.

## Auth

- `POST /auth/register-customer`
- `POST /auth/login` — all roles (JWT includes `role`, `user_id`)
- Shop/driver/admin accounts are created by admin (or seed); they use the same login

## Products

- `GET /products` — Product Bank listing (admin/public as designed)
- `GET /shops/:shopId/products` — visible in-stock shop catalogue
- `POST /admin/products/import`
- `GET /admin/products/export`

## Shops

- `GET /shops`
- `GET /shops/:id`

## Orders (MVP)

- `POST /orders` — creates order + **one** `order_fulfillment` + items; runs MVP routing
- `GET /orders/:id` — includes fulfillments and items
- `GET /customers/me/orders` — authenticated customer’s orders

## Shop Portal

- `GET /shop-portal/orders` — fulfillments for this shop
- `PATCH /shop-portal/orders/:fulfillmentId/status`
- `GET /shop-portal/products`
- `PATCH /shop-portal/products/:id`

## Driver

- `GET /driver/orders/today` — fulfillments assigned to driver for today
- `PATCH /driver/orders/:fulfillmentId/status`
- `POST /driver/orders/:fulfillmentId/feedback`

## Admin (MVP)

- `GET /admin/customers`
- `PATCH /admin/customers/:id/block`
- `GET /admin/shops`
- `POST /admin/shops` (create/update as needed)
- `POST /admin/users` — create shop/driver/admin users and link `shop_users` / `drivers`

## Admin (Phase 2)

- `GET /admin/analytics/summary`

---

# 7. Routing Engine

Module: `backend/src/modules/routing-engine/`

## 7.1 MVP routing (implement first)

### Inputs

- Customer `preferred_shop_id` (pickup) or delivery `area_name`
- Order `fulfillment_mode`
- Shop stock (`shop_products.is_in_stock`)
- Shop `delivery_zones` / calendar eligibility
- Requested products + quantities

### Logic

**Pickup**

- Require `preferred_shop_id`
- All items must be available at that shop
- Output: one fulfillment for that shop; `delivery_date` null

**Scheduled delivery**

- Resolve `delivery_date` from `delivery_calendar` for `delivery_area_name`
- Candidate shops: active, serve that area, have all items in stock
- Select single shop: preferred if valid, else first/nearest available (nearest if lat/lng present; else deterministic shop id order)
- Output: one fulfillment with `shop_id` + `delivery_date`

### Output (MVP)

- `fulfillments[]` length 1: `{ shop_id, delivery_date, estimated_delivery_at? }`
- `fulfillment_mode`
- Reject order with clear error if no shop can fulfill

## 7.2 Phase 2 routing

### Additional inputs

- Customer location (lat/lng)
- Real-time delivery zones
- Per-item shop availability (split basket)
- Customer risk score (may restrict realtime or COD-like options)

### Logic

**Realtime delivery**

- Filter shops in realtime zone with stock
- Sort by distance + reliability
- Select best shop (or split into multiple fulfillments if multi-shop enabled)

**Multi-shop / multi-outlet**

- Partition line items across shops when no single shop has full stock
- Create one `order_fulfillment` per selected shop
- Preserve pickup rule: still one shop only

---

# 8. Delivery Calendar Engine

Module: `backend/src/modules/delivery-calendar/`

### Responsibility

- Map `area_name` → next eligible `delivery_day` / concrete `delivery_date`
- Used by scheduled-delivery order creation and MVP routing

### Rules

- Lookup active rows in `delivery_calendar`
- Compute next calendar date matching `delivery_day` from “now” (or customer-selected week)
- Return error if area has no delivery day configured

---

# 9. Stock Prediction Engine (Phase 2)

Module: `backend/src/modules/stock-prediction/`

### Rule

- If drivers report tag `item_missing` for the same `shop_product` **2+ times within 3 days**:
  - Set `is_in_stock = false`
  - Set `stock_status_source = system`
  - Update `last_stock_update_at`

Shop can override via shop portal (`stock_status_source = shop`).

Do not implement in MVP beyond storing feedback tags.

---

# 10. Customer Risk Engine (Phase 2)

Module: `backend/src/modules/risk-engine/`

Consume `order_events` and `driver_feedback`. Do not invent scores without persisted events.

### Rules (starting set)

- Refund event → +10
- Complaint event → +8
- Driver tags:
  - `rude` → +15
  - `frequent_refunder` → +10
- Average driver rating for customer < 3 → +10

### Requirements

- Persist score on `customers.risk_score`
- Snapshot onto order when useful (`risk_score_at_order`)
- Admin block remains manual (`is_blocked`); scoring informs admin, does not auto-ban in v1 of this engine

---

# 11. Frontend — Customer

`frontend-customer/` — Vite + React + TypeScript + Tailwind. Dev server port **5173**.

## 11.1 Customer UI architecture (source of truth)

### Landing = catalogue

- Route `/` **is** the catalogue homepage
- `/catalogue` redirects to `/` for compatibility

### Header (minimal)

- Left: logo
- Center: empty (search lives in the hero)
- Right: location pill, Help, Sign in, Cart
- Sticky on scroll
- Mobile: location + cart (+ Categories control)

### Hero (Chaldal-style)

- Full-width search
- Headline + subheadline
- Trust indicators (verified halal, local stock, delivery/pickup, clear fees)
- Delivery calendar preview

### Category sidebar

- Multi-level: category → sub-category → sub-sub-category (collapsible)
- Icons + popular pins at top
- Desktop sticky; mobile slide-in drawer
- Popular categories tiles on the landing body

### Product card (strict)

- **One image only** (no gallery); placeholder if `imageUrl` missing
- Name, price hierarchy, optional shop name, color-coded stock, Add to cart
- Optional: verified halal badge, shop partner badge
- Desktop hover elevation only

### Catalogue grid

- Mobile: 2 columns · Tablet: 3 · Desktop: 4–6
- Recommended section must **not** duplicate products already in the main grid
- Skeletons, empty, and error states required

### Consistency

- Shared design system in `shared/src/web/` (tokens, UI components, Zustand stores, React Query hooks)
- Apps import via `@halal-basket/web` Vite alias
- Shared `--hb-*` CSS tokens, typography (Fraunces display / Plus Jakarta body)
- Button variants: primary / secondary / tertiary
- Unified card radius/border; inline SVG icons (no extra icon library)
- WCAG AA: focus states, labels, contrast
- State: Zustand (cart, catalogue filters, auth, toasts)
- Data: TanStack Query (shops, products, delivery calendar, …)

### Enterprise enhancements (MVP+)

Trust badges, delivery calendar preview, real-time stock when available, toasts, modals, sticky mobile cart CTA.

## 11.2 MVP routes / pages

- `/catalogue` — homepage
- Checkout (pickup vs scheduled delivery)
- Order confirmation
- Order status
- Help / FAQ
- Sign-in / register
- **Temporary:** `/admin`, `/super-admin` (role-gated) until a dedicated admin app exists

Defer realtime delivery UI and multi-shop split UX to Phase 2.

---

# 12. Frontend — Shop Portal

`frontend-shop/` — Vite + React + TypeScript + Tailwind. Dev server port **5174**.

**MVP pages:**

- Login (shop role)
- Dashboard
- Orders (this shop’s fulfillments)
- Products (stock + price)
- Scheduled delivery prep (filter by `delivery_date`)

Use the same design tokens and header/footer consistency as customer (shop-appropriate nav).

---

# 13. Frontend — Driver

`frontend-driver/` — Vite + React + TypeScript + Tailwind. Dev server port **5175**.

**MVP pages:**

- Login (driver role)
- Today’s deliveries (assigned fulfillments)
- Order / fulfillment detail
- Delivery status update
- Feedback form (rating, tags including `item_missing`)

Same tokens and layout consistency; mobile-first.

---

# 14. Implementation Order

## MVP roadmap (follow in order)

1. Create monorepo + backend NestJS project
2. Configure PostgreSQL + Prisma
3. Implement database schema (sections 4.1–4.14)
4. Implement auth (all roles) + seed admin
5. Implement Product Bank + barcode + QR generation
6. Implement bulk import/export
7. Implement shops + `shop_products`
8. Implement delivery calendar engine
9. Implement MVP routing engine (single fulfillment)
10. Implement order creation (order + fulfillment + items + events)
11. Implement shop portal endpoints
12. Implement driver endpoints
13. Implement customer frontend
14. Implement shop portal frontend
15. Implement driver frontend
16. Basic admin (customers, shops, users, block)

## Phase 2 roadmap (after MVP is usable)

17. Realtime delivery + zone checks
18. Multi-shop routing (multiple fulfillments)
19. Risk scoring engine
20. Stock prediction engine
21. Payments provider
22. Admin analytics
23. Maps / live updates as needed

---

# 15. Notes for Cursor AI

- Follow the **MVP roadmap** top-to-bottom before Phase 2
- Use TypeScript everywhere
- Keep routing, risk scoring, and stock prediction as separate modules
- Barcode is required and unique; QR is generated when missing — do not require both on import
- Bulk import must validate barcode
- Scheduled delivery must use `delivery_calendar`
- Pickup orders must restrict products to one shop and one fulfillment
- Orders use `order_fulfillments`; never assume a single `shop_id` on `orders`
- Persist refunds/complaints/status changes as `order_events` so Phase 2 risk has real data
- Platform locale: default currency EUR and language `en`; extras are dynamic CRUD with publish/unpublish; customer pickers only when 2+ published (see `docs/platform-locale.md`)
- Do not add new libraries unless already in this blueprint’s stack (or explicitly approved)

---

# End of File
