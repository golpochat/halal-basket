# WhatsApp shop experience — step tracker

Goal: use WhatsApp as **chat + quick cart**, and the **customer app** as the branded shop.  
Mark each step `[x]` only after **Done when** passes. Secrets stay in `.env` — never paste tokens in chat.

Companion docs:

- Plumbing (Meta + sync): [whatsapp-catalog-checklist.md](./whatsapp-catalog-checklist.md) — **Steps 1–8 done**
- Meta setup notes: [whatsapp-meta-setup.md](./whatsapp-meta-setup.md)
- Product behaviour + backlog: [whatsapp.md](./whatsapp.md)

---

## Progress

| Phase | Step | Status |
|-------|------|--------|
| A | Catalog plumbing (assets → sync → smoke) | **Done** — catalog checklist Steps 1–8 |
| B | 1 — Business profile + catalog cover | **Done (sandbox)** — profile blocked; assets in `docs/whatsapp-branding/` |
| B | 2 — Product images & names | **Partial** — Meta-safe filter + prune shipped; asset polish still open |
| B | 3 — Public tunnels + Assist/Shop as primary path | **Wired** — dual tunnels live; phone smoke still needed |
| B | 4 — Care defaults (Assist first, Catalog when needed) | Not started (process / optional UI) |
| B | 5 — Curated multi-product messages (optional) | Deferred (no MPM send API yet) |

### Already shipped in code (supports Phase B)

- Meta eligibility filter + prune (meat/fish/eggs) — `meta-catalog-eligibility.ts`
- Admin Simulate multi-line cart + Meta-safe product dropdown
- Cart → order with richer **Pay securely** CTA (item lines, totals; HTTPS header image when `PUBLIC_API_URL` is public)
- Catalog message copy steers meat/fish/eggs to Assist/Shop
- Branding PNGs under `docs/whatsapp-branding/` + pay header under `backend/uploads/branding/`

### Known limitations (do not block Steps 2–4)

| Issue | Reality |
|-------|---------|
| “View sent cart” → Something went wrong | WhatsApp client rehydrates live catalog; broken images / pruned SKUs / dead tunnels |
| Parked cart “reply ORDER to retry” | `ORDER` only opens shop today — enhancement in [whatsapp.md](./whatsapp.md) |
| Test number profile | Cannot edit photo/name until production number |

---

## Phase A — Catalog plumbing (complete)

Already verified:

- [x] Meta assets + catalog permissions + system user token  
- [x] Catalog linked to WABA + commerce settings  
- [x] Sync `100/100` + catalog + cart on phone  

If sync/catalog break again (dead tunnel, expired token), re-run [whatsapp-catalog-checklist.md](./whatsapp-catalog-checklist.md) Steps 3, 6, 7, 8.

---

## Phase B — Polish & care UX

### Step 1 — Business profile + catalog cover

**Why:** WhatsApp chrome shows Meta’s business identity. You cannot restyle the product list.

**Prepared assets** (in `docs/whatsapp-branding/`):

| File | Use for |
|------|---------|
| `whatsapp-profile-photo.png` | WhatsApp / business **profile picture** (square) |
| `brand-mark-profile-alt.png` | Alternate profile (existing app icon) |
| `whatsapp-catalog-cover.png` | **Facebook/Instagram Shop** cover only (not WhatsApp catalog) |
| `whatsapp-catalog-cover-brand.png` | Alternate Shop cover |

**Important (Meta reality check)**

- A **product catalogue** has **no cover photo** setting. Commerce Manager → Settings → Catalogue only has name, cropping, etc.
- WhatsApp’s in-chat catalog header uses the **phone number profile** (photo + display name), not a Commerce “banner”.
- A wide **cover / banner** exists only on a **Facebook/Instagram Shop**, which is separate from WhatsApp catalog.

#### Exact locations (your Halal Basket IDs)

| What | Exact place | Editable on test number? |
|------|-------------|--------------------------|
| WhatsApp profile photo / name | [WhatsApp Manager → Phone numbers → Profile](https://business.facebook.com/latest/whatsapp_manager/phone_numbers/?business_id=2629448367471414) → select `+1 555-197-4815` → **Profile** | **No** — “Profile for the test phone number cannot be edited.” |
| Catalogue settings (no cover field) | [Catalogue Settings](https://business.facebook.com/commerce/catalogs/3314863175353012/settings/?business_id=2629448367471414) | N/A — no cover upload here |
| Shop cover / banner (FB/IG only) | [Commerce Manager → Shops](https://business.facebook.com/commerce/shops/?business_id=2629448367471414) → create/edit shop → cover / Edit shop | Only if a Shop exists; **does not change WhatsApp catalog UI** |
| Business portfolio avatar (admin only) | Business settings → Business info → Edit portfolio picture | Yes — optional; not shown in WhatsApp catalog |

**Do (sandbox)**

1. Confirm WhatsApp Profile is blocked (already done) — expected.
2. Optional: open **Shops** URL above. If empty, skip — do not force-create a FB Shop just for WhatsApp.
3. Keep assets in `docs/whatsapp-branding/` for a **production** WhatsApp number later.
4. Mark this step complete as **blocked on test number** and continue to Step 2 (product images — those *do* show in WhatsApp).

**Done when:** You understand profile is blocked on test; assets are saved; we move on (or you’ve uploaded a Shop cover for FB/IG knowing it won’t fix WhatsApp).

- [x] Step 1 complete (sandbox: profile blocked; assets ready)

---

### Step 2 — Product images & names

**Why:** Inside WhatsApp you only control thumbnail, title, and price. Better assets = less “basic list”.

**Meta policy (important)**

Meta Commerce **rejects meat, fish, and eggs for consumption**. Sync now **excludes** those SKUs (category `Meat & Poultry`, egg products, and matching names/tags) and **prunes** them from the Meta catalog on each sync. Sell meat/fish/eggs via **Assist / Shop** only.

**Do**

1. Admin → Catalogue (or Commerce Manager → Products): spot-check the synced set — should be pantry/produce/dairy (non-egg), not lamb/chicken/eggs.
2. Prefer square photos (~1:1), consistent lighting, readable packaging.
3. Names: unit in the title (`Basmati Rice 5kg`, `Olive Oil 1L`).
4. After image/name fixes: Admin → WhatsApp → **Catalog** → **Sync catalog** (tunnel + `PUBLIC_API_URL` must be live HTTPS). Confirm sync shows skipped/pruned Meta-policy counts.
5. On phone: thumbs load (not grey). If grey → Step 3 / catalog checklist Step 6 first.

**Done when:** Phone catalog shows clear thumbs + readable names for Meta-allowed products; sync `ok > 0`; meat/fish/eggs absent or pruned.

- [ ] Step 2 complete *(code filter done; visual polish + live-image verify still open)*

---

### Step 3 — Public tunnels + Assist / Shop links

**Why:** Branded browsing lives in the customer app. Assist/Shop/Pay need HTTPS URLs Meta and phones can open (not `localhost`).

**Do**

1. Keep **two** tunnels running while testing:
   - API `:3000` → `PUBLIC_API_URL`
   - Customer `:5173` → `CUSTOMER_APP_URL` (+ `CORS_ORIGINS` includes that origin)
2. After any tunnel restart, update `.env`, restart backend, and if needed re-sync catalog.
3. Admin Inbox → allow-listed thread → **Assist link** and **Shop link** → open on phone.
4. Confirm customer app loads over the customer tunnel (not blocked host).
5. Place or Simulate a cart → **Pay securely** opens confirmation on the phone.

**Done when:** Assist, Shop, and Pay links open the Halal Basket customer UI on the phone without localhost errors; catalog images still load after sync.

- [ ] Step 3 complete *(ops wired 2026-08-05 — see Current focus; mark `[x]` after phone smoke)*

#### Live tunnel snapshot (ephemeral — replace after any cloudflared restart)

| Role | Port | URL (current) |
|------|------|----------------|
| Customer app | 5173 | `https://sending-floyd-header-sun.trycloudflare.com` |
| API (+ images / webhook) | 3000 | local `http://localhost:3000` (start a tunnel only when phone/Meta must reach the API) |

`CUSTOMER_APP_URL` must match the **live** customer tunnel. Old pay links (e.g. `carolina-…`) die when the tunnel restarts — send a new cart or reply **PAY** after env reload.  
**Meta webhook (if using inbound):** tunnel the API and point the callback at that host.

---

### Step 4 — Care defaults (Assist first)

**Why:** Catalog is fine for in-chat cart; Assist/Shop is the branded experience. Care should lead with the app unless the customer asks for catalog.

**Do**

1. Agree the default care reply pattern:
   - First offer: **Assist** (or Shop) link  
   - If they want to browse in WhatsApp: **Catalog**
2. Optionally update admin copy / button order later (code change — only when you ask).
3. Smoke: send Assist → customer shops in app; send Catalog → cart in WhatsApp still works.

**Done when:** Team/you use Assist as the default outbound browse path; Catalog still works as a secondary path.

- [ ] Step 4 complete

---

### Step 5 — Curated multi-product messages (optional / later)

**Why:** Full catalog is always a flat list. Sections (“Weekly staples”, “Pantry”) feel intentional. Meat sections belong in Assist/Shop only (Meta policy).

**Do (when ready)**

1. Design 2–3 sections (≤ ~30 products each) in Commerce Manager or via API — Meta-safe SKUs only.
2. Add admin/API support to send **multi-product** interactive messages (code work — not started).
3. Smoke on allow-listed phone.

**Done when:** Phone receives a sectioned product picker (not only full catalog).

- [ ] Step 5 complete *(deferred until Steps 2–4 done)*

---

## Recommended enhancement order

1. **Step 3** — dual tunnels so phone Assist/Pay/images work reliably  
2. **Step 2** — polish thumbs/names, re-sync, verify on phone  
3. **Code:** parked-cart retry (`ORDER` / admin button) — see [whatsapp.md](./whatsapp.md)  
4. **Step 4** — Assist-first care habit  
5. Production number + profile assets (meta-setup go-live)  
6. **Step 5** MPM if still needed  

---

## Current focus

**→ Step 3 phone smoke** (ops already wired):

1. Keep customer tunnel running (`https://sending-floyd-header-sun.trycloudflare.com` currently).
2. After any tunnel restart, update `CUSTOMER_APP_URL` + CORS, restart backend, then send a **new** cart / **PAY** (old links expire with the old hostname).
3. Admin Inbox → allow-listed thread → **Assist** / **Shop** / **Pay securely** → open on phone or PC.
4. Reply **Step 3 done** when those pass.

When finished, reply **Step 3 done**. Then we mark `[x]` and move to Step 2 visual finish / Step 4.
