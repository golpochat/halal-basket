# Security checklist (Phase F)

- [x] Helmet enabled
- [x] Rate limiting (`@nestjs/throttler`)
- [x] CORS allowlist via `CORS_ORIGINS` (comma-separated); open only if unset (local)
- [x] Passwords bcrypt cost 12
- [x] JWT expiry via `JWT_EXPIRES_IN`
- [x] Login lockout (`LOGIN_MAX_ATTEMPTS`, `LOGIN_LOCK_MINUTES`)
- [x] RBAC guards on admin / shop / driver / customer routes (roles + permission checks on platform modules)
- [x] Secrets in env only (`.env` gitignored)
- [x] Audit log for block, refund, complaint, payment, GDPR
- [x] GDPR export + erase endpoints (+ admin Privacy UI)
- [ ] Dependency audit reviewed before each production release (`npm audit`)
- [ ] Stripe live keys only in Production; webhook signature verified

## RBAC matrix (summary)

| Surface | Access |
|---------|--------|
| `/admin/*` | `admin` / `super_admin` (+ fine-grained permissions e.g. `branding.write`, `gdpr.write`, `legal.write`) |
| `/shop-portal/*` | shop, admin |
| `/driver/*` | driver, admin |
| `/orders` create | customer |
| `/payments/*/intent` | customer, admin |

Staff UI: **admin app** `:5176` only. See `docs/seed-credentials.md`.

