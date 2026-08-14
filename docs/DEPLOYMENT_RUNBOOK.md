# Deployment and Recovery Runbook

## Release

1. Run `npm run verify` from the repository root.
2. Create and verify a Supabase database backup before applying migrations.
3. Apply `roster-core-service/prisma/migrations` in staging with `npm run db:deploy`.
4. Verify existing organisations received unique slugs and retain their tenant data.
5. Configure the variables in each `.env.example`. The auth service must use a server-side Supabase service-role key for the atomic onboarding functions. The JWT secret must match across auth and roster services; the notification service key must match across roster and notification services.
6. Deploy notification-service, auth-service, roster-core-service, then the client.
7. Run both services' `/health` checks and the two-tenant acceptance journey from the implementation plan.

## Rollback

- Roll application deployments back through the hosting provider first.
- The feature migration adds data and columns. Do not drop them during an application rollback; the previous application ignores them.
- If a migration fails before completion, stop deployment and restore the verified pre-release backup rather than manually deleting production data.

## Backup and restore test

- Enable the production backup/PITR option supported by the Supabase plan.
- At least monthly, restore the latest backup into a separate project and verify row counts, foreign keys, login, roster history, and notification logs.
- Record the restore date, backup timestamp, duration, result, and operator in the operational log.

## Monitoring

- Monitor `/health` for all three services.
- Alert on elevated 5xx/429 responses, failed notification logs, database connection failures, and sustained latency.
- Never include JWTs, passwords, service keys, or Supabase keys in application logs.
