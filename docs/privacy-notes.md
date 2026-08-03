# Privacy notes (Ireland / EU)

Halal Basket processes customer account data (name, email, phone, addresses), order history, driver feedback, and shop operational data.

## Principles for pilot

- Collect only what is needed to fulfill orders and operate shops/drivers.
- JWT sessions are stored in browser `localStorage` per app — treat devices as trusted for pilot staff apps.
- Driver feedback and `order_events` may include sensitive conduct flags; restrict admin access via RBAC (`gdpr.*`, ops permissions).
- Customer block is a manual admin action; risk scoring runs on feedback/refunds (Phase E).
- Published legal policies live as `LegalDocument` rows (privacy, terms, cookies, refunds) — customer `/legal/:slug`, admin **Legal pages**.
- Admin **Privacy** UI supports customer search, summary, export, and erase (anonymize PII; blocked if open fulfillments or unsettled payments).

## Cookie consent

- Cookies **policy** is published (`/legal/cookies`).
- Customer app shows an essential-only CMP: **Accept all** / **Essential only**, preference in `localStorage` (`hb-cookie-consent`). Reopen via footer **Cookie preferences**.
- No analytics/advertising scripts are loaded yet. Gate future tags on `hasAnalyticsConsent()` in `frontend-customer/src/lib/cookie-consent.ts`.

## Retention (pilot default)

- Orders and events: retain for operational period + 12 months unless legal hold.
- Feedback tags: retain with order record.
- Auth logs: not yet centralized; prefer Phase G observability.

This is operational guidance, not legal advice.
