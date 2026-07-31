# Backup & restore (Postgres)

## Targets

- **RPO:** 24h (daily dump minimum for pilot); tighten for production
- **RTO:** 2h (restore from dump + migrate deploy + smoke)

## Backup

```bash
docker exec halal-basket-postgres pg_dump -Uhalal -dhalal_basket -Fc > backup-$(date +%F).dump
```

Store off-host (object storage). Keep at least 7 daily + 4 weekly.

## Restore drill

```bash
# stop API writers
docker exec -ihalal-basket-postgres pg_restore -Uhalal -dhalal_basket --clean --if-exists < backup-YYYY-MM-DD.dump
# or create empty DB then restore
npx prisma migrate deploy
curl -s http://localhost:3000/health
```

Document date/time of last successful drill in your ops log.
