# Platform currencies & languages

Defaults: **Euro (`EUR` / €)** and **English (`en`)**.  
Super-admin can **add / modify / delete** any currency or language, and **publish (enable) / unpublish (disable)** each option.

## Customer UX rule

| Condition | UI |
|-----------|-----|
| Only 1 published currency | No currency picker (always € / default) |
| 2+ published currencies | Currency selector shown |
| Only 1 published language | No language picker (always English / default) |
| 2+ published languages | Language selector shown |

Public payload: `GET /platform/locale`  
Returns published lists + `showCurrencyPicker` / `showLanguagePicker`.

## Seeded catalogue (editable)

**Currencies:** EUR (default, published), GBP, USD (unpublished until you publish).  
**Languages:** en (default, published), bn, hi, ur, ar (unpublished until you publish).

You can add more (e.g. CAD, ga) or delete non-defaults any time from **Platform → Currencies / Languages**.

## Rules

- Cannot **unpublish** or **delete** the current default.
- **Make default** auto-publishes that option and clears the previous default flag.
- New rows start **unpublished** so they do not appear in customer pickers until you publish.
- Shop/order amounts stay in the **default** currency; `exchangeRate` converts for **display** only (units of this currency per 1 default). Stripe remains EUR until multi-currency payments are built.
- Language switch sets `html lang` + `dir` (RTL for Urdu/Arabic). Full translated UI string packs are a follow-up (see [`SYSTEM-COMPLETE.md`](../SYSTEM-COMPLETE.md) § What’s next).
- Language picker is **hidden on customer/shop/driver storefronts** until packs ship; admin can still CRUD/publish locales.

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
- UI: Super-admin Platform page; customer `LocalePickers` on landing + catalogue
