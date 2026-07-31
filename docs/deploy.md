# Deploy runbook

## Environments

| Env | Purpose |
|-----|---------|
| Local | Docker Postgres `:5433`, API `:3000` |
| Staging | Production-like; UAT |
| Production | Pilot / live |

## Deploy steps (API)

1. Set secrets: `DATABASE_URL`, `JWT_SECRET`, `ADMIN_*`, feature flags, `PAYMENT_PROVIDER`, CORS
2. `npm ci`
3. `npx prisma migrate deploy` (forward-only; never `db push` in Staging/Prod)
4. `npm run build -w backend`
5. `npm run start:prod -w backend`
6. Verify `GET /health` and `GET /health/metrics`

## Frontends

Build with `VITE_API_URL` pointing at the API origin; deploy static `dist/` behind CDN or host.

## Rollback

1. Redeploy previous image/commit
2. Do **not** reverse migrations unless a dedicated down migration is prepared and reviewed
