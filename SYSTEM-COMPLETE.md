# System complete — Halal Basket

Phases **A–F** from [`halal-basket-absolute-roadmap.md`](./halal-basket-absolute-roadmap.md) are implemented across **four** frontends + Nest API.

| Phase | Status |
|-------|--------|
| A Foundation | Done |
| B Order Core | Done |
| C Operator frontends (MVP) | Done |
| D Realtime / multi-shop / live | Done |
| E Payments / risk / stock / analytics | Done |
| F Enterprise hardening | Done (core exits met; see open gaps below) |
| G Scale | Optional — not required for pilot |

## Surfaces

| App | Script | Port |
|-----|--------|------|
| API | `npm run dev:backend` | 3000 |
| Customer | `npm run dev:customer` | 5173 |
| Shop | `npm run dev:shop` | 5174 |
| Driver | `npm run dev:driver` | 5175 |
| Admin | `npm run dev:admin` | 5176 |

See root `README.md` and `docs/pilot-onboarding.md`.

## Phase F exit criteria

- [x] Backup/restore RTO/RPO documented in `docs/backup-restore.md`
- [x] CI: unit tests, builds (shared + backend + four frontends), migrate, seed, e2e smoke (`.github/workflows/ci.yml`)
- [x] Security checklist in `docs/security-checklist.md` (remaining items are release-time)
- [x] On-call drill via `POST /admin/ops/test-alert`

## Post-roadmap deltas (shipped after A–F checklist)

These are live beyond the original phase checklists:

- Dedicated **admin app** (`frontend-admin/`) with Platform vs Work nav
- **RBAC** roles/permissions (`legal.*`, `branding.*`, `gdpr.write`, etc.)
- **Legal documents** (admin editor + customer `/legal/:slug`)
- **GDPR** Privacy UI (search, export, erase)
- Featured categories, multi-item branding, delivery locations & fees tables, enterprise coupons

## Open gaps (not blockers for local pilot)

| Gap | Notes |
|-----|--------|
| Cookie consent banner | Shipped on customer app (Accept all / Essential only); no analytics tags yet |
| Stripe test Checkout | Local smoke verified (Checkout → return sync marks paid); Staging host + webhook still optional |
| Customer favourites | Heart on catalogue + `/customer/favourites` (product-id keyed) |
| i18n string packs | Locale CRUD + pickers done; translated copy packs are follow-up |
| Driver rating history | Recent feedback table on driver overview (avg still in summary) |
| Live hub | In-memory SSE; Redis needed for multi-instance (Phase G) |
| Retired `frontend/` | Folder still on disk; safe to delete after confirming four apps |

## What’s next (recommended sequence)

1. **i18n string packs** when publishing a second language  
2. **Staging host cutover** — real Staging URL + Stripe webhook endpoint (`docs/deploy.md`)  
3. **Warehouse publish** when stock + routing UAT is ready  
4. **Phase G lite** — Redis for live hub, centralized auth logs, delete retired `frontend/`, `npm audit` before prod  

**Done recently:** cookie consent; driver rating history; Stripe test Checkout; customer favourites.

Detail and runbooks: `docs/pilot-onboarding.md`, `docs/deploy.md`, `docs/privacy-notes.md`, `docs/chaldal-takeaways.md`.
