# WhatsApp catalog — from-scratch checklist

Track progress here. Mark each step `[x]` only after it passes the **Done when** check.  
Secrets stay in `backend/.env` only — never paste tokens in chat.

## Status (2026-08)

| Area | State |
|------|--------|
| Steps 1–8 (Meta assets → sync → phone catalog + cart) | **Complete** for sandbox |
| Product images stay fetchable | **Fragile** — needs live `PUBLIC_API_URL` HTTPS tunnel; Step 6 hostname below is historical |
| Assist / pay links on phone | **Not durable** until shop-experience Step 3 (customer tunnel) |
| Meat/fish/eggs in Meta catalog | **Filtered + pruned** in code — sell via Assist/Shop only |
| “View sent cart” detail on phone | **Meta UI** — may show “Something went wrong”; use Admin / Pay CTA (see [whatsapp.md](./whatsapp.md)) |

**Next polish:** [whatsapp-shop-experience-checklist.md](./whatsapp-shop-experience-checklist.md) Steps 2–4.  
**If sync/catalog breaks:** re-run Steps **3, 6, 7, 8** (token / tunnel / sync / commerce settings).

| ID | Known value (Halal Basket sandbox) |
|----|--------------------------------------|
| Meta app | Halal Basket (`1095272556161627`) |
| Business portfolio | Halal Basket |
| WABA | Test WhatsApp Business Account (`1762157481648934`) |
| Phone number ID | `1268899259635506` (test `+1 555-197-4815`) |
| Catalog | Halal Basket (`3314863175353012`) |
| Verify token | `hb-wa-verify-dev` |

---

## Step 1 — Confirm Meta assets

**Do**

1. [developers.facebook.com](https://developers.facebook.com) → My Apps → **Halal Basket** exists.
2. Business settings → WhatsApp accounts → **Test WhatsApp Business Account** (`1762157481648934`).
3. Commerce Manager / Catalogues → **Halal Basket** → Settings → Catalogue ID = `3314863175353012`.

**Done when:** All three IDs match the table above (or you update the table if Meta recreated them).

- [x] Step 1 complete

---

## Step 2 — Catalog people permissions

**Do**

1. Business settings → Data sources → Catalogues → **Halal Basket**.
2. Assign people → your admin user → **Full access (Manage everything)** → Assign.

**Done when:** Your user shows Full / Manage on that catalog.

- [x] Step 2 complete

---

## Step 3 — Access token with catalog rights

WhatsApp “Try it out” tokens often **lack** `catalog_management`. You need a token that includes at least:

- `business_management`
- `catalog_management`
- `whatsapp_business_management`
- `whatsapp_business_messaging`

**Do (pick one path)**

### Path A — Graph API Explorer

1. [Graph API Explorer](https://developers.facebook.com/tools/explorer) → Meta App **Halal Basket**.
2. **Add a Permission** (search) → add the four permissions above.  
   If `catalog_management` is missing: App Dashboard → **App Review → Permissions and features** → add `business_management` + `catalog_management`, then return to Explorer.
3. **Generate access token** → approve dialogs.
4. Put the new value in `backend/.env` as `WHATSAPP_TOKEN=…` (replace old).
5. Restart backend.

### Path B — System User (preferred long-term)

1. Business settings → Users → System users → create Admin.
2. Assign assets: catalog **Halal Basket**, WhatsApp WABA, app.
3. Generate token with the same permissions.
4. Update `WHATSAPP_TOKEN` → restart backend.

**Done when:** Token is updated in `.env` and backend restarted.

- [x] Step 3 complete (system user `hb-system` + Catalog API use case; token includes `catalog_management`)

---

## Step 4 — Prove the token can read the catalog

**Do** (PowerShell — loads token from `.env`, do not paste token in chat):

```powershell
cd "D:\Exclusive projects\Halal Basket\backend"
$line = Get-Content .env | Where-Object { $_ -match '^WHATSAPP_TOKEN=' }
$token = ($line -replace '^WHATSAPP_TOKEN=', '').Trim()
if (-not $token) { throw 'WHATSAPP_TOKEN missing' }
Invoke-RestMethod `
  -Uri "https://graph.facebook.com/v25.0/3314863175353012?fields=id,name" `
  -Headers @{ Authorization = "Bearer $token" }
```

**Done when:** Response includes `id` = `3314863175353012` and a `name` (e.g. Halal Basket).  
If error = missing permissions / unsupported → repeat Step 3.

- [x] Step 4 complete

---

## Step 5 — Link catalog to WABA

WhatsApp Manager **Catalogue** is often **disabled** on Test WABA. Use API:

```powershell
# reuse $token from Step 4
Invoke-RestMethod -Method Post `
  -Uri "https://graph.facebook.com/v25.0/1762157481648934/product_catalogs" `
  -Headers @{ Authorization = "Bearer $token" } `
  -ContentType "application/json" `
  -Body '{"catalog_id":"3314863175353012"}'
```

Verify:

```powershell
Invoke-RestMethod `
  -Uri "https://graph.facebook.com/v25.0/1762157481648934/product_catalogs" `
  -Headers @{ Authorization = "Bearer $token" }
```

**Done when:** List includes catalog `3314863175353012` (or UI Catalogue shows it connected).

- [x] Step 5 complete

---

## Step 6 — Public HTTPS for product images

Seed images are `/uploads/products/…`. Meta needs public `https://`.

**Do**

1. Tunnel running:  
   `& "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:3000`
2. Copy the **current** `https://….trycloudflare.com` host.
3. `backend/.env`:  
   `PUBLIC_API_URL=https://….trycloudflare.com`  
   (must match the live tunnel — not an old hostname)
4. Restart backend.
5. Browser check: `https://….trycloudflare.com/uploads/products/rice.jpg` (or any seeded image) loads.

**Done when:** Image URL opens in browser over HTTPS via the tunnel.

- [x] Step 6 complete *(once with a live tunnel; hostname changes every cloudflared restart — always re-check current `PUBLIC_API_URL`, do not trust an old hostname in notes)*

---

## Step 7 — Sync from Halal Basket Admin

**Do**

1. Admin → WhatsApp → **Catalog** → **Sync catalog** (wait for Syncing…).
2. Expect `ok/attempted` with **ok > 0**.
3. Commerce Manager → Products should show items.

**Done when:** Last sync shows `ok > 0` (not `0/100`).  
If still `0/100`, check backend logs: permissions vs image URI vs catalog ID.

- [x] Step 7 complete (`100/100`)

---

## Step 8 — Commerce settings + smoke test

**Do**

```powershell
# reuse $token
Invoke-RestMethod -Method Post `
  -Uri "https://graph.facebook.com/v25.0/1268899259635506/whatsapp_commerce_settings?is_catalog_visible=true&is_cart_enabled=true" `
  -Headers @{ Authorization = "Bearer $token" }
```

Then either:

- Admin Inbox → allow-listed thread → **Catalog**, or  
- Simulate / phone `CATALOG` (real inbound may need **Published** app).

**Done when:** Catalog message succeeds (or clear Meta error different from “catalog not linked”).

- [x] Step 8 catalog smoke test passed (catalogue + cart on phone). Assist/pay links need public `CUSTOMER_APP_URL` (not localhost).

---

## Stop / defer conditions

| Blocker | Action |
|---------|--------|
| Cannot add `catalog_management` to app | Use System User (Step 3B) or defer Phase D |
| Test WABA Catalogue UI always grey | Use Step 5 API; ignore UI |
| Unpublished app | Real phone → webhook may not arrive; use Simulate for inbound |
| Tunnel URL changes | Update `PUBLIC_API_URL` + Meta webhook URL + re-sync |
| `PUBLIC_API_URL=localhost` | Meta cannot fetch images; View sent cart / thumbs break |
| Multi-shop cart parks as needs-help | Set `FEATURE_MULTI_SHOP=true` |

## Maintenance (after Steps 1–8)

1. Keep System User token fresh (`catalog_management` + messaging scopes).
2. Before phone image/cart tests: API tunnel up → set `PUBLIC_API_URL` → restart backend → **Sync catalog**.
3. Before Assist/pay on phone: customer tunnel → `CUSTOMER_APP_URL` + `CORS_ORIGINS` (shop checklist Step 3).
4. Prefer Admin **Simulate** multi-item cart when app is unpublished.
5. Ordered lines: Admin inbox / HB order / **Pay securely** — not WhatsApp “View sent cart”.

## Related

- Behaviour + backlog: [whatsapp.md](./whatsapp.md)
- Polish tracker: [whatsapp-shop-experience-checklist.md](./whatsapp-shop-experience-checklist.md)
- Meta setup notes: [whatsapp-meta-setup.md](./whatsapp-meta-setup.md)
