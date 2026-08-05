# Platform currencies & languages

Defaults: **Euro (`EUR` / €)** and **English (`en`)**.  
Super-admin can **add / modify / delete** any currency or language, and **publish (enable) / unpublish (disable)** each option.

## Customer UX rule

| Condition | UI |
|-----------|-----|
| Only 1 published currency | No currency picker (always € / default) |
| 2+ published currencies | Currency selector shown |
| Only 1 published language **with a UI pack** | No language picker (always English / default) |
| 2+ published languages **with UI packs** | Language selector shown |

Public payload: `GET /platform/locale`  
Returns published lists + `showCurrencyPicker` / `showLanguagePicker`.  
Frontends further filter languages to those with a UI string pack (`en`, `bn`, `hi`, `ur`, `ar`).

## Seeded catalogue (editable)

**Currencies:** EUR (default, published), GBP, USD (unpublished until you publish).  
**Languages:** en (default, published), bn (Bangla), hi (Hindi), ur (Urdu), ar (Arabic) — unpublished until you publish.

You can add more (e.g. CAD, ga) or delete non-defaults any time from **Platform → Currencies / Languages**. New language codes need a matching pack under `shared/src/web/i18n/packs/` before they appear in pickers.

## Rules

- Cannot **unpublish** or **delete** the current default.
- **Make default** auto-publishes that option and clears the previous default flag.
- New rows start **unpublished** so they do not appear in customer pickers until you publish.
- Shop/order amounts stay in the **default** currency; `exchangeRate` converts for **display** only (units of this currency per 1 default). Stripe remains EUR until multi-currency payments are built.
- Language switch sets `html lang` + `dir` (RTL for Urdu/Arabic) and loads UI copy from the matching string pack (fallback to English per key).
- Language picker is shown on **customer and shop** once 2+ pack-backed languages are published.
- **Admin (incl. super-admin) and driver** dashboards stay **English-only** (currency picker still works).

## UI string packs

| Code | Pack file |
|------|-----------|
| `en` | `shared/src/web/i18n/packs/en.ts` |
| `bn` | `shared/src/web/i18n/packs/bn.ts` |
| `hi` | `shared/src/web/i18n/packs/hi.ts` |
| `ur` | `shared/src/web/i18n/packs/ur.ts` |
| `ar` | `shared/src/web/i18n/packs/ar.ts` |

Helper: `t(key, lang)` / `useLocale().t` — covers chrome, account nav, footer, fulfillment/payment/order labels, driver feedback tags, delivery attempt reasons, and catalogue taxonomy names.

## Admin API (super_admin)

| Method | Path |
|--------|------|
| GET | `/admin/currencies`, `/admin/languages` |
| POST | `/admin/currencies`, `/admin/languages` |
| PATCH | `/admin/currencies/:id`, `/admin/languages/:id` |
| PATCH | `/admin/currencies/:id/publish`, `/admin/languages/:id/publish` body `{ "isPublished": true\|false }` |
| POST | `/admin/currencies/:id/set-default`, `/admin/languages/:id/set-default` |
| DELETE | `/admin/currencies/:id`, `/admin/languages/:id` |

## Related

- Schema: `PlatformCurrency`, `PlatformLanguage` in `backend/prisma/schema.prisma`
- Module: `backend/src/modules/platform-locale/`
- UI: Admin → Languages; language pickers on customer + shop (admin/driver English-only)
