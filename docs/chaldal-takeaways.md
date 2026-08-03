# Chaldal Takeaways for Halal Basket

Reference site: [https://chaldal.com/](https://chaldal.com/)  
Last reviewed: August 2026  
Post-MVP status: see [`SYSTEM-COMPLETE.md`](../SYSTEM-COMPLETE.md) § What’s next.

**Rule:** Steal UX and trust patterns. Do **not** copy dark-store, 1-hour delivery, multi-vertical sprawl, or non-grocery mega-mart catalogue.

---

## MVP (implement with current roadmap)

These map to customer-facing work in Phases B–C (catalogue, orders, calendar, frontends). Do not invent new schema unless the blueprint already supports it.

### 1. Search-first catalogue + sticky cart

| | |
|---|---|
| **What Chaldal does** | Persistent search with grocery examples; cart always visible with item count + total |
| **What we take** | Dominant search on browse; cart summary that stays visible while shopping |
| **Why** | Grocery buyers know what they want; search beats browsing for repeat baskets. Fits Product Bank SKU lookup. |
| **Where** | `frontend-customer/` catalogue + cart shell; Product Bank search API already planned |

### 2. Service-area / location gate before checkout

| | |
|---|---|
| **What Chaldal does** | City/location selection before promising delivery |
| **What we take** | Require area (or postcode → area) before showing delivery day / allowing delivery checkout; pickup can still work with shop selection |
| **Why** | Matches delivery-calendar engine (area → delivery day). Prevents false promises outside pilot zones. |
| **Where** | Delivery calendar + customer order flow (Phases B–C) |

### 3. Four trust lines above the fold (adapted)

| | |
|---|---|
| **What Chaldal does** | +15k products · pay after receive · 1 hour · save money |
| **What we take** | Replace with Halal Basket truths, e.g.: verified / trusted halal · scheduled delivery or pickup · stock from local shops · clear fees |
| **Why** | Builds trust before browse; do **not** claim 1-hour or COD unless we actually offer them. |
| **Where** | Customer landing / home (Phase C) |

### 4. Public fee + refund / returns FAQ

| | |
|---|---|
| **What Chaldal does** | Fee table by city/order size; delivery hours; perishable vs packaged refund rules |
| **What we take** | Static Help/FAQ: delivery fee rules, delivery days by area, pickup rules, refund/complaint basics |
| **Why** | Cuts support load; Ireland customers expect clarity before first order. |
| **Where** | Customer Help page + later admin complaint flows (full refund admin = Phase E) |

### 5. Deep food category taxonomy (halal grocery only)

| | |
|---|---|
| **What Chaldal does** | Nested nav: Food → Fruits & Vegetables → Fresh Vegetables / Fresh Fruits |
| **What we take** | Clear parent/child categories for meat, pantry, dairy, produce, etc. — **no** fashion/vehicle/toys |
| **Why** | Hierarchy scales catalogue discovery; breadth outside grocery dilutes brand. |
| **Where** | Product Bank categories + customer browse (Phases A–C) |

### 6. Strategic focus (process, not a UI feature)

| | |
|---|---|
| **Lesson** | Early Chaldal won by deepening one dense market; late Chaldal hurt itself with multi-city + multi-vertical sprint |
| **What we take** | One Irish metro cluster until Phase C exit criteria; no new verticals; no hire-ahead-of-demand |
| **Why** | Thin grocery margins punish distraction. Roadmap already encodes this — treat it as non-negotiable. |

### 7. Admin-gated currency & language (not Chaldal’s always-on toggle)

| | |
|---|---|
| **What Chaldal does** | Always shows EN / বাং language toggle |
| **What we take** | Default **€** + **English** only. Super-admin CRUD + publish/unpublish extras (€/£/$ and en/bn/hi/ur/ar seeded, fully dynamic). Pickers appear **only if** 2+ options are published. |
| **Why** | Avoid UI clutter when only Ireland/English is live; stay flexible for diaspora languages later. |
| **Where** | See [`docs/platform-locale.md`](./platform-locale.md) |

---

## Future implementations (post-MVP)

Do **not** build these in Phases A–C. Revisit after pilot has repeat order cadence and stable unit economics.

### F1. Loyalty / points / membership (Egg Club analogue)

- **Chaldal:** Points, cash-back language, free shipping perks, exclusive offers.
- **HB version:** Points or stamp-style rewards after N orders; free delivery threshold; member-only deals.
- **When:** After Phase C pilot proves weekly/repeat baskets; optional Phase E+ growth.
- **Depends on:** Order history, customer accounts, clear margin to fund rewards.

### F2. Coupons & offers centre — **done (core)**

- **Chaldal:** Coupons, Offers, Deal of the Day, Flash Sales.
- **HB version:** Admin **Promotions** (banner + coupon table/modal); validate on checkout (`startsAt` / `endsAt` / max limits). Sample codes `HALAL10`, `WELCOME5`.
- **Still open:** Deal-of-the-day SKUs / flash sales if shops want them later.

### F3. Favourites / reorder — **done**

- **Chaldal:** Favourites in nav.
- **HB version:** Heart toggle on catalogue cards; account **Favourites** page; reorder from past baskets.
- **Depends on:** Customer auth + Product Bank id (not shop-product id).

### F4. Live chat / premium assisted ordering

- **Chaldal:** Chat widget + Premium Care for busy customers / order issues.
- **HB version:** In-app or WhatsApp support first; paid concierge only at volume.
- **When:** Support load justifies cost (post-pilot).
- **Depends on:** Staffing or third-party chat; order_events for complaint trail.

### F5. App-download / first-order incentive

- **Chaldal:** “5% off first order through the app.”
- **HB version:** Native app later; until then, first-order web promo is enough.
- **When:** Native apps are not MVP; revisit if retention needs a push.
- **Depends on:** Mobile apps (out of current MVP scope).

### F6. Pay on delivery / cash on delivery (optional)

- **Chaldal:** “Pay after receiving” as a core trust prop (BD market).
- **HB version:** Stripe/card first (Phase E). Optional pay-on-delivery only if pilot customers demand it and drivers can collect safely.
- **When:** After card payments work; only if research shows need in Ireland/halal segment.
- **Depends on:** Driver cash handling SOP, reconciliation, risk engine (Phase E).

### F7. Corporate / B2B accounts

- **Chaldal:** Corporate customer programme.
- **HB version:** Mosque/community/business bulk orders, invoicing.
- **When:** After consumer pilot is stable.
- **Depends on:** Multi-address, net terms, admin invoicing — not in MVP schema focus.

### F8. Brand / “popular on” strip

- **Chaldal:** Logos of Unilever, Nestlé, etc.
- **HB version:** Trusted halal certifiers / partner shops / known brands once catalogue has depth.
- **When:** Marketing polish after catalogue quality is solid.
- **Depends on:** Permission to use marks; real assortment.

---

## Explicitly do not take

| Item | Reason |
|------|--------|
| Owned dark stores / micro-warehouses | Contradicts shop-network MVP; high CapEx |
| 1-hour delivery as default promise | MVP is scheduled calendar + pickup |
| Fashion, vehicle, toys, lifestyle mega-mart | Dilutes halal grocery positioning |
| Multi-city expansion before unit economics | Chaldal’s costly lesson |
| Parallel new verticals (pharmacy, wallet, 3PL) | Fragments ops attention |
| Hire large support org ahead of volume | Thin margins; payroll risk |

---

## Suggested MVP trust lines (copy draft)

Use on customer home / landing — refine with brand voice later:

1. **Trusted halal** — products from shops you can verify  
2. **Pickup or scheduled delivery** — choose what fits your week  
3. **Local shop stock** — ordered from shops that hold the item  
4. **Clear fees** — delivery and service costs shown before you pay  

---

## Checklist

**MVP**

- [x] Search-first catalogue UX  
- [x] Sticky / always-visible cart summary  
- [x] Area gate tied to delivery calendar  
- [x] Four adapted trust lines on home  
- [x] Help/FAQ: fees, days, pickup, refunds basics  
- [x] Nested food categories only  
- [x] Admin-gated currency & language (dynamic CRUD + publish; pickers if 2+)  

**Future**

- [ ] Loyalty / points  
- [x] Coupons & deals centre (admin promo codes + checkout validation; flash/deal SKUs optional later)  
- [x] Reorder from past baskets  
- [x] Favourites / wishlist  
- [ ] Live chat / premium care  
- [ ] App / first-order incentive  
- [ ] Optional pay-on-delivery  
- [ ] Corporate accounts  
- [ ] Certifier / brand trust strip  
- [x] Cookie consent banner (before analytics)  

