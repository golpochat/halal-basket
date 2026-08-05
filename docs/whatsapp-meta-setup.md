# WhatsApp — Meta app & Cloud API setup

Companion to [whatsapp.md](./whatsapp.md). Use this when wiring Meta (developers.facebook.com) to Halal Basket.

**Sandbox catalog plumbing:** complete — see [whatsapp-catalog-checklist.md](./whatsapp-catalog-checklist.md).  
**Polish / phone Assist:** [whatsapp-shop-experience-checklist.md](./whatsapp-shop-experience-checklist.md).

## Done for local / sandbox

These steps were completed for initial development:

1. Create a Meta app (name must **not** include “WhatsApp” — trademark block).
2. Use case: **Connect with customers through WhatsApp**.
3. Connect Business portfolio (e.g. Halal Basket). Verification can wait.
4. **Step 1. Try it out** — claim test number, generate temporary access token, add a personal recipient, send a sample template.
5. Put values in `backend/.env` (never commit secrets):

```bash
WHATSAPP_TOKEN=<system user or temporary token>
WHATSAPP_PHONE_NUMBER_ID=<from API setup / test number>
WHATSAPP_API_VERSION=v21.0
WHATSAPP_VERIFY_TOKEN=<invented secret, e.g. hb-wa-verify-dev>
WHATSAPP_CATALOG_ID=<Commerce catalog id — sandbox Halal Basket catalog is linked>
```

Graph Explorer / checklists may use `v25.0`; keep whatever version your token and Graph accept. Default in `.env.example` is `v21.0`.

6. Expose local API for webhooks (Meta cannot call `localhost`):

```powershell
# Cloudflare Tunnel (preferred if Laragon ngrok is too old)
& "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:3000
```

7. Meta → WhatsApp → **Step 2. Production setup** → **Configure Webhooks**:

- Callback URL: `https://<tunnel-host>/whatsapp/webhook`
- Verify token: same as `WHATSAPP_VERIFY_TOKEN`
- Subscribe to `messages` (required for inbox / keywords / commerce orders)

8. Keep **backend** (`PORT=3000`) and the tunnel running while testing inbound.

9. **Catalog commerce (Phase D)** — create/link catalog, system user with `catalog_management`, sync `100/100`, cart on phone — tracked and **done** in the catalog checklist. Re-sync whenever `PUBLIC_API_URL` changes.

### Notes

- Sandbox / unpublished apps can only message numbers on the **test recipient allow list** (Meta API setup → Step 1). Seed phones like `+353879990001` will fail admin reply with Meta `#131030` until you use a real allow-listed number (or a production number).
- **Unpublished (Dev mode) apps often do not deliver real inbound WhatsApp messages to your webhook.** Meta may only send _test_ webhooks from the dashboard until the app is **Published** (Live). The Step 1 “Check test webhooks” table can show events that never hit Halal Basket. Until then, use Admin → WhatsApp → **Simulate** or `POST /whatsapp/dev/inbound`.
- If the app is Live but phone messages still never appear, subscribe the WABA to the app via Graph API: `POST /{WABA_ID}/subscribed_apps`.
- Opening `/whatsapp/webhook` in a browser returns **Forbidden** without Meta’s `hub.`\* query params — that is expected.
- Opening `/` returns Nest `Cannot GET /` — expected.
- Temporary tokens expire (~24h). Prefer System User token (`catalog_management` + messaging) for longer sessions.
- Quick tunnels (`*.trycloudflare.com`) get a **new URL** each restart — update Meta’s callback URL, `PUBLIC_API_URL`, and usually re-sync catalog.
- Customer Assist/Shop/Pay on a **phone** also need a second tunnel for `:5173` → `CUSTOMER_APP_URL` (+ CORS).
- Laragon’s bundled ngrok (e.g. 3.1.0) may be rejected (`ERR_NGROK_121`). Prefer cloudflared or a current ngrok agent (≥ 3.20).
- Test WhatsApp number **profile cannot be edited** — upload branding on a production number ([whatsapp-branding/](./whatsapp-branding/)).

Permissions for messaging (Ready for testing is enough locally):

- `whatsapp_business_messaging`
- `whatsapp_business_management`

For catalog sync also:

- `catalog_management`
- `business_management`

---

## Later — production business phone number

Do this when ready for a real customer-facing WhatsApp number (not the `+1 555…` test number).

### 1. Register the number

Meta → WhatsApp → **Step 2. Production setup** → **Register your WhatsApp phone number** → **Add new number**.

- Use a real mobile/landline you control (SMS or voice OTP).
- Number must not already be registered on another WhatsApp Business / consumer WhatsApp account (or migrate/delete first).
- After registration, copy the new **Phone number ID** into `WHATSAPP_PHONE_NUMBER_ID` (replaces the test ID).
- Upload profile photo/name from `docs/whatsapp-branding/`.

### 2. Add payment

**Add payment to send business-initiated messages** → Billing Hub.

- Needed for outbound **templates** outside the free tier / customer-care window.
- First ~1,000 user-initiated conversations/month are often free (check current Meta pricing).

### 3. Permanent access token

On **Send message** → **Generate token**, or manually:

1. Meta Business Settings → **Users** → **System users** → create (Admin).
2. Assign assets: the WhatsApp Business Account + app + Commerce catalog.
3. Generate token with messaging + `catalog_management` as needed.
4. Put it in `WHATSAPP_TOKEN` (prefer env/secrets store in production — never commit).

### 4. Message templates (Halal Basket Phase A)

Create and approve templates in WhatsApp Manager, then set names in `.env`:

| Env                                  | Purpose                 |
| ------------------------------------ | ----------------------- |
| `WHATSAPP_TEMPLATE_ORDER_PLACED`     | Order placed / pay link |
| `WHATSAPP_TEMPLATE_PAYMENT_RECEIVED` | Payment confirmed       |
| `WHATSAPP_TEMPLATE_FULFILLMENT`      | Fulfillment status      |

Names must match Meta exactly (language codes too, as used by the provider). Until set, Phase A Meta sends are skipped silently.

### 5. Business verification

**Step 3. Business verification** — required for App Review / broader production access. Can be deferred until publish.

### 6. Webhook on a stable host

Replace the ephemeral Cloudflare/ngrok URL with the deployed API:

`https://<production-api-host>/whatsapp/webhook`

Same verify token pattern; subscribe to `messages` (order payloads use the same field).

Set production `PUBLIC_API_URL` / `CUSTOMER_APP_URL` to stable HTTPS hosts (not tunnels).

### 7. Catalog commerce (Phase D) — create & link Commerce catalog

Sandbox already has a linked catalog. Use this section when recreating for production or a new portfolio.

#### A. Create the catalog (Commerce Manager)

1. Open [business.facebook.com](https://business.facebook.com) → select portfolio **Halal Basket**.
2. Go to **Commerce Manager**
   Direct: [business.facebook.com/commerce](https://business.facebook.com/commerce)  
    Or Business settings → **Commerce** / **Catalogs**.
3. **Add catalog** / **Create catalog**.
4. Choose **E‑commerce** (products you sell online) — not hotels/flights/etc.
5. Catalog name: e.g. `Halal Basket`.
6. Assign to the **same** Business portfolio that owns your WhatsApp WABA (**Halal Basket**).
   Wrong portfolio → catalog won’t appear when linking WhatsApp.
7. Create with an empty catalog (Halal Basket will push products via **Sync catalog**).
   Skip Shopify/CSV unless you prefer a one-off manual upload.
8. Open the new catalog → copy the **Catalog ID** (long numeric ID in the URL or Catalog details).

#### B. Link catalog to WhatsApp

1. Business settings → **Accounts** → **WhatsApp accounts** → your WABA (test or production).
2. Open **Catalog** (or Assets → Catalog) → **Select catalog** → choose `Halal Basket`.
3. Confirm the catalog is attached to the phone number you’ll use for Cloud API.

Alternate path: WhatsApp Manager → your number → **Catalog** → connect catalog.  
Test WABA Catalogue UI is often grey — use Graph `/{WABA_ID}/product_catalogs` (catalog checklist Step 5).

#### C. Enable cart + catalog visibility

With a valid token and `WHATSAPP_PHONE_NUMBER_ID`:

```bash
# Show storefront / catalog in chat profile
curl -X POST "https://graph.facebook.com/v25.0/<PHONE_NUMBER_ID>/whatsapp_commerce_settings?is_catalog_visible=true" \
  -H "Authorization: Bearer <WHATSAPP_TOKEN>"

# Cart is usually on by default; force-enable if needed
curl -X POST "https://graph.facebook.com/v25.0/<PHONE_NUMBER_ID>/whatsapp_commerce_settings?is_cart_enabled=true" \
  -H "Authorization: Bearer <WHATSAPP_TOKEN>"
```

Halal Basket’s Meta provider also attempts a commerce-settings update after a successful product sync.

#### D. Wire Halal Basket

1. In `backend/.env`:

```bash
WHATSAPP_CATALOG_ID=<catalog id from step A.8>
PUBLIC_API_URL=https://<stable-or-tunnel-api-host>
CUSTOMER_APP_URL=https://<stable-or-tunnel-customer-host>
FEATURE_MULTI_SHOP=true
```

2. Restart the backend.
3. Admin → WhatsApp → **Catalog** → **Sync catalog**
   (pushes up to 100 Meta-safe in-stock products; `retailer_id` = product UUID; meat/fish/eggs excluded + pruned).
4. Webhook must stay subscribed to `messages` (order payloads use the same field).
5. Test: allow-listed number → `CATALOG` → browse → submit cart → unpaid HB order + **Pay securely**
   (or Admin **Simulate** cart while unpublished).

#### Notes

- Test WABA can link a catalog, but **real inbound cart webhooks** still need a **Published** app (same restriction as care messages).
- Product images need publicly reachable **HTTPS** URLs. Seed images are `/uploads/products/…` — set `PUBLIC_API_URL` to a public origin so Meta can fetch them. `localhost` image URLs are stripped/rejected.
- Don’t create a second Meta _app_ for the catalog — catalog lives under the **Business portfolio**, then links to the existing WhatsApp product.
- WhatsApp **View sent cart** is a Meta client screen; broken images / pruned products cause “Something went wrong” — Admin / Pay CTA are source of truth ([whatsapp.md](./whatsapp.md)).

---

## Quick checklist (go-live)

### Sandbox (done)

- [x] Test number + webhook pattern + allow-listed recipient
- [x] Catalog linked + `WHATSAPP_CATALOG_ID` + sync + cart smoke
- [x] System user path for `catalog_management` (re-generate token if expired)

### Production (remaining)

- [ ] Production phone registered; `WHATSAPP_PHONE_NUMBER_ID` updated; profile branding uploaded
- [ ] Payment method on WABA
- [ ] Permanent System User token in `WHATSAPP_TOKEN`
- [ ] Templates approved + env names set
- [ ] Webhook on stable HTTPS URL; `messages` subscribed
- [ ] Stable `PUBLIC_API_URL` + `CUSTOMER_APP_URL` (no ephemeral tunnels)
- [ ] Business verification / app published as required by Meta
- [ ] Catalog re-linked / re-synced for production catalog if separate
- [ ] (Enhance) Parked-cart retry + Assist-first care — see [whatsapp.md](./whatsapp.md)

## Related

- Feature behaviour: [whatsapp.md](./whatsapp.md)
- Catalog ops: [whatsapp-catalog-checklist.md](./whatsapp-catalog-checklist.md)
- Shop polish: [whatsapp-shop-experience-checklist.md](./whatsapp-shop-experience-checklist.md)
- Env template: root `.env.example` (`WHATSAPP_*`, `PUBLIC_API_URL`, `CUSTOMER_APP_URL`)
- Backend routes: `GET/POST /whatsapp/webhook`
- Deploy notes: [deploy.md](./deploy.md)
