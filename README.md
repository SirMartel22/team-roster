# BHBC Media Roster / Rosterly

Multi-tenant roster scheduling platform composed of a React client and three Express services.

## Local setup

1. Copy each `.env.example` file to `.env` in the same directory and supply secrets.
2. Use the same `JWT_SECRET` in auth-service and roster-core-service.
3. Use the same `NOTIFICATION_SERVICE_KEY` in auth-service, roster-core-service, and notification-service.
4. Apply database changes from roster-core-service with `npm run db:deploy`, then run `npm run db:generate`.
5. Start auth-service, roster-core-service, notification-service, and client with `npm run dev` in each directory.

Default local ports are 4001, 4002, 4003, and 5173 respectively.

## Verification

Run `npm run verify` from the repository root. This executes backend unit tests, client lint, and the production client build.

## Deployment order

1. Back up the database and apply the Prisma migration.
2. Configure new environment values, including service authentication and CORS origins.
3. Deploy notification-service and auth-service together so invitation and password-reset email contracts stay compatible.
4. Deploy roster-core-service.
5. Deploy the client with both public service URLs.
6. Complete the two-tenant acceptance journey documented in `BHBC_Media_Roster_Implementation_Plan.md`.

Do not deploy the application code before applying the slug/schema migration: the new authentication and feature routes depend on those columns and tables.


I recommend implementing this in phases: recurring schedules → month-ahead generation → email reminders → acknowledgements → push → WhatsApp → SMS.