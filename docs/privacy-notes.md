# Privacy notes (Ireland / EU — Phase C)

Halal Basket processes customer account data (name, email, phone, addresses), order history, driver feedback, and shop operational data.

## Principles for pilot

- Collect only what is needed to fulfill orders and operate shops/drivers.
- JWT sessions are stored in browser `localStorage` per app — treat devices as trusted for pilot staff apps.
- Driver feedback and `order_events` may include sensitive conduct flags; restrict admin access.
- Customer block is a manual admin action; automated risk scoring is Phase E.
- Provide a contact channel for access/erasure requests during pilot; full GDPR tooling lands in Phase F.

## Retention (pilot default)

- Orders and events: retain for operational period + 12 months unless legal hold.
- Feedback tags: retain with order record.
- Auth logs: not yet centralized; prefer Phase F observability.

This is operational guidance, not legal advice.
