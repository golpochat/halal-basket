# WhatsApp — notifications, care, assist, catalog commerce

Phase **A**: outbound order notifications (opt-in).  
Phase **B**: inbound webhook, keyword bot, admin care inbox.  
Phase **C**: assisted-order bridge (`PAY` / `LIST`, assist deep link).  
Phase **D**: Meta catalog sync + cart order → HB unpaid order + Stripe pay link.

Companion trackers:

| Doc | Purpose |
|-----|---------|
| [whatsapp-catalog-checklist.md](./whatsapp-catalog-checklist.md) | Phase D Meta plumbing (sandbox **Steps 1–8 done**) |
| [whatsapp-shop-experience-checklist.md](./whatsapp-shop-experience-checklist.md) | Polish & care UX (Phase B Steps 2–5 open) |
| [whatsapp-meta-setup.md](./whatsapp-meta-setup.md) | Meta app, webhooks, production go-live |
| [whatsapp-branding/](./whatsapp-branding/) | Profile / cover assets (production number) |

---

## Implementation status (code vs ops)

### Shipped in code (Phases A–D)

| Area | Status | Notes |
|------|--------|--------|
| Opt-in + outbound templates hooks | Done | Needs Meta-approved template names in env for live sends |
| Webhook + keywords + admin inbox | Done | Sandbox: allow-list + often Simulate until app Published |
| Assist / Shop deep links | Done | Phone needs public `CUSTOMER_APP_URL` (not localhost) |
| Catalog sync (≤100) + Meta-safe filter | Done | Excludes meat/fish/eggs; prunes blocked retailer IDs |
| Cart webhook → unpaid HB order | Done | Requires `FEATURE_MULTI_SHOP=true` for multi-shop baskets |
| Admin Simulate multi-item cart | Done | Dropdown = same Meta-safe product set |
| **Pay securely** CTA URL | Done | Fallback to text URL if Meta rejects (e.g. localhost) |
| Park unlinked / failed carts | Done | `pending_commerce_json` + Needs help |

### Remaining / enhance next

| Priority | Item | Type |
|----------|------|------|
| High | Stable dual tunnels: API `PUBLIC_API_URL` + customer `CUSTOMER_APP_URL` (+ CORS) | Ops — shop checklist Step 3 |
| High | Retry parked carts (`ORDER` copy promises retry; keyword only opens shop today) | Code |
| High | Production phone + profile photo (test number profile is blocked) | Ops — meta-setup |
| Med | Product image/name polish for WhatsApp thumbs | Ops — shop checklist Step 2 |
| Med | Assist-first care defaults (Catalog secondary) | Process / optional UI |
| Med | Approve Phase A templates + permanent System User token | Ops — go-live |
| Low | Curated multi-product (MPM) messages | Code — shop checklist Step 5 |
| Low | Admin “Retry pending cart” button | Code |
| — | WhatsApp **View sent cart** detail UI | Meta client only — see below |

---

## Phase A — outbound

| Event | Template key | When |
|-------|--------------|------|
| Order placed | `order_placed_pay` | After `POST /orders` if customer opted in |
| Payment paid | `payment_received` | After `markPaid` |
| Fulfillment status | `fulfillment_update` | After shop/driver status `recordStatusEvent` |

Messages are **never** allowed to fail checkout or payment — errors are logged only.

### Opt-in

- Stored on `customers.whatsapp_opt_in` (+ `whatsapp_opt_in_at`)
- Phone on `users.phone` (E.164, e.g. `+353871234567`)
- Set at **Checkout** (confirm step) or **Profile**
- Opt-in without a valid phone is rejected by the API

---

## Phase B — inbound care

| Piece | Detail |
|-------|--------|
| Storage | `whatsapp_threads` / `whatsapp_messages` |
| Webhook | `GET/POST /whatsapp/webhook` |
| Local stub | `POST /whatsapp/dev/inbound` |
| Admin UI | Admin → **WhatsApp** (`whatsapp.read` / `whatsapp.reply`) |

---

## Phase C — assisted-order bridge

| Piece | Detail |
|-------|--------|
| `needsAssistance` | LIST / free-text shopping request |
| Assist JWT | `?wa_assist=` (~2h); redeem `GET /whatsapp/assist/:token` |
| Send assist / shop | Admin thread actions |

---

## Phase D — catalog commerce bridge

```mermaid
flowchart LR
  Sync[Admin catalog sync]
  MetaCat[Meta catalog]
  Cart[Customer WhatsApp cart]
  Orders[OrdersService.create]
  Pay[Pay link]

  Sync --> MetaCat --> Cart --> Orders --> Pay
```

| Piece | Detail |
|-------|--------|
| Retailer ID | `Product.id` (same UUID as web checkout) |
| Sync | `POST /admin/whatsapp/catalog/sync` — up to 100 in-stock products (**excludes meat/fish/eggs** per Meta Commerce animals policy; those stay in the customer app) |
| Prune | Sync deletes Meta products that are no longer Meta-safe |
| Catalog picks | `GET /admin/whatsapp/catalog/products` — same Meta-safe set for Admin **Simulate** product dropdown |
| Send catalog | Keyword `CATALOG` or `POST .../send-catalog` |
| Order webhook | Meta `type: order` → create unpaid HB order |
| Fulfillment | First saved address → `scheduled_delivery`; else `pickup` |
| Unlinked phone | Park cart in `pending_commerce_json`, set `needsAssistance` |
| Dev | `POST /whatsapp/dev/order` `{ phone, items: [{ productId, quantity }] }` |
| Payment | Stripe via confirmation URL — outbound **Pay securely** CTA (header/footer when Meta accepts); keyword `PAY` still returns a text URL |
| Multi-shop | Same as web: set `FEATURE_MULTI_SHOP=true` or multi-shop carts park as needs-help |

### “View sent cart” → Something went wrong (WhatsApp UI)

That screen is **WhatsApp’s native cart viewer**, not Halal Basket. Opening it re-loads product details/images from the **live** Meta catalog. It fails when:

- Product `image_url` / `url` is not publicly fetchable (`PUBLIC_API_URL` is `localhost` or a dead tunnel)
- Products were **pruned**, rejected, or heavily updated after the cart was sent
- Android catalog UI bugs (subset load / refresh)

**Source of truth for ordered items:** Admin inbox `[commerce cart]` / HB order / **Pay securely** CTA (lists lines from our DB). Do not rely on “View sent cart” in sandbox.

### Keywords (case-insensitive)

| Keyword | Reply |
|---------|--------|
| `HELP` | Care blurb + keyword list |
| `STATUS` / `STATUS <ref>` | Order status |
| `PAY` / `PAY <ref>` | Unpaid pay URL (text) |
| `ORDER` / `SHOP` | Web shop link only — **does not** replay `pending_commerce_json` (enhancement backlog) |
| `CATALOG` | Catalog message (or stub shop link) |
| `LIST` / free-text list | Escalate for assist |

Parked-cart copy currently says “reply ORDER or ask us to retry”; until retry is implemented, staff should **Simulate** the cart again or place via Assist after the customer links phone in Profile.

---

## Providers

| Mode | Condition |
|------|-----------|
| **Console stub** | `WHATSAPP_TOKEN` or `WHATSAPP_PHONE_NUMBER_ID` empty |
| **Meta Cloud API** | Both set; catalog sync also needs `WHATSAPP_CATALOG_ID` |

---

## Environment

```bash
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_API_VERSION=v21.0          # Graph calls; sandbox docs often use v25.0 — both fine if Graph accepts
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_CATALOG_ID=                # Meta Commerce catalog ID (Phase D)
WHATSAPP_TEMPLATE_ORDER_PLACED=
WHATSAPP_TEMPLATE_PAYMENT_RECEIVED=
WHATSAPP_TEMPLATE_FULFILLMENT=
CUSTOMER_APP_URL=http://localhost:5173   # phone tests: public HTTPS tunnel
PUBLIC_API_URL=http://localhost:3000     # Meta images: public HTTPS tunnel required
FEATURE_MULTI_SHOP=true                  # needed for multi-shop WhatsApp carts
JWT_SECRET=                              # also signs wa_assist tokens
```

After any tunnel restart: update `PUBLIC_API_URL` / `CUSTOMER_APP_URL` / `CORS_ORIGINS`, Meta webhook callback, restart backend, re-sync catalog if images changed host.

### Meta app / Cloud API

See **[whatsapp-meta-setup.md](./whatsapp-meta-setup.md)** — sandbox steps done; production phone, billing, templates, stable webhook still open.

**Catalog commerce ops:** **[whatsapp-catalog-checklist.md](./whatsapp-catalog-checklist.md)** (Steps 1–8 complete; re-run 3/6/7/8 if token/tunnel breaks).

**Polish tracker:** **[whatsapp-shop-experience-checklist.md](./whatsapp-shop-experience-checklist.md)**.

### Meta setup (Phase D) — summary

1. Create a Commerce catalog in Meta Business Manager; set `WHATSAPP_CATALOG_ID`
2. Connect catalog to the WhatsApp Business phone number; enable cart
3. Admin → WhatsApp → **Sync catalog** (retailer_id = product UUID)
4. Webhook must receive `messages` including order payloads
5. Point `GET/POST /whatsapp/webhook` + verify token as in Phase B

---

## Local test

### A–C

See prior sections / migrations `…120000` opt-in, `…130000` inbox, `…140000` assist.

### Phase D

1. Run migration `20260804150000_whatsapp_commerce`
2. **Sync catalog** with live HTTPS `PUBLIC_API_URL` (stub logs product ids if Meta unset)
3. Simulate `CATALOG` → stub catalog / shop link
4. Simulate commerce cart with phone linked to a customer + Meta-safe product UUID → HB order + pay URL
5. Unlinked phone → pending cart + Needs help
6. HELP / STATUS / PAY / LIST / assist still work

---

## Out of scope

NLP free-text → order lines without cart/agent; Meta India checkout buttons; Twilio; full Commerce Manager collections UX.
