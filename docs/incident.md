# Incident response (pilot)

## Severity

- **SEV1:** API down, payments failing broadly, data loss risk
- **SEV2:** Partial outage (one shop/zone), elevated 5xx
- **SEV3:** Degraded UX, non-blocking bugs

## First 15 minutes

1. Check `GET /health` and `GET /health/metrics` (`http5xx`)
2. Check Postgres connectivity / disk
3. Check recent deploys; roll back if correlated
4. Capture `x-request-id` from failing clients
5. For payments: inspect `audit_logs` for `payment.*` and Stripe dashboard

## Test alert drill

```bash
curl -X POST http://localhost:3000/admin/ops/test-alert \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"reason":"on-call-drill"}'
```

Expect ERROR log line `ALERT_TEST fired`.
