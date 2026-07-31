# Security checklist (Phase F)

- [x] Helmet enabled
- [x] Rate limiting (`@nestjs/throttler`)
- [x] CORS allowlist via `CORS_ORIGINS` (comma-separated); open only if unset (local)
- [x] Passwords bcrypt cost 12
- [x] JWT expiry via `JWT_EXPIRES_IN`
- [x] Login lockout (`LOGIN_MAX_ATTEMPTS`, `LOGIN_LOCK_MINUTES`)
- [x] RBAC guards on admin / shop / driver / customer routes
- [x] Secrets in env only (`.env` gitignored)
- [x] Audit log for block, refund, complaint, payment, GDPR
- [x] GDPR export + erase endpoints
- [ ] Dependency audit reviewed before each production release (`npm audit`)
- [ ] Stripe live keys only in Production; webhook signature verified

## RBAC matrix (summary)

| Surface | Roles |
|---------|--------|
| `/admin/*` | admin |
| `/shop-portal/*` | shop, admin |
| `/driver/*` | driver, admin |
| `/orders` create | customer |
| `/payments/*/intent` | customer, admin |
