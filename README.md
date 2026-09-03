# Rosterly

Rosterly is a multi-tenant team-roster application for administrators and members of churches, volunteer groups, media teams, and other organisations that share recurring duties.

## The user and the problem

**Primary user:** an organisation or team administrator who coordinates people across work units and recurring service dates.

**Secondary user:** a team member who needs a clear, reliable view of assigned duties and a way to acknowledge them.

**Problem:** recurring rosters are often assembled manually in spreadsheets or chat threads. That makes assignments difficult to distribute fairly, changes hard to track, and reminders easy to miss. Rosterly gives each organisation an isolated workspace where an administrator can organise teams, generate and publish schedules, record attendance, and notify members from one place.

## What the application does

- Creates isolated organisation workspaces with administrator and member roles.
- Organises members into work units and assigns duties to those units.
- Generates draft rosters while considering assignment history and consecutive-service fairness.
- Allows administrators to review and manually reassign draft entries.
- Publishes rosters and sends assignment emails.
- Supports recurring schedules, rolling roster generation, and reminder automation.
- Lets members view and acknowledge published assignments.
- Records attendance and calculates member performance summaries.
- Supports invitations, password reset, sign-out, and unit-switch requests.
- Maintains audit and notification-delivery records.

## Architecture

The repository contains a React client and three Express services:

| Component | Responsibility | Default port |
| --- | --- | ---: |
| `client` | React/Vite user interface | `5173` |
| `auth-service` | Workspace creation, registration, login, invitations, password reset, and logout | `4001` |
| `roster-core-service` | Work units, members, duties, roster generation, publishing, attendance, and automation | `4002` |
| `notification-service` | Transactional email delivery and notification logs | `4003` |

PostgreSQL is accessed through Supabase and Prisma. Resend is used for outbound email.

```text
Browser
  |-- authentication requests ----------> auth-service
  |-- roster and workspace requests ----> roster-core-service
                                               |
auth-service ----------------------------------+----> notification-service ----> Resend
  |                                            |
  +---------------- PostgreSQL/Supabase <------+
```

## Repository layout

```text
.
|-- client/                       React application
|-- auth-service/                 Authentication API
|-- roster-core-service/          Roster API, Prisma schema, and automation worker
|-- notification-service/         Email notification API
|-- docs/                         API contract, guides, and deployment runbook
|-- BHBC_Media_Roster_Implementation_Plan.md
|-- cron.md                       Automation and hosting notes
`-- package.json                  Root verification commands
```

## Prerequisites

- Node.js 20 or newer and npm.
- A PostgreSQL database or Supabase project.
- A Supabase server-side service-role key.
- A Resend account and verified sender for production email.

## Local setup

### 1. Install dependencies

Run these commands from the repository root:

```bash
npm --prefix auth-service install
npm --prefix roster-core-service install
npm --prefix notification-service install
npm --prefix client install
```

### 2. Create environment files

Copy every example file to `.env` in the same directory:

```text
auth-service/.env.example          -> auth-service/.env
roster-core-service/.env.example   -> roster-core-service/.env
notification-service/.env.example  -> notification-service/.env
client/.env.example                -> client/.env
```

Required configuration:

| Variable | Used by | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Roster service | PostgreSQL connection string used by Prisma |
| `SUPABASE_URL` | Auth, notifications | Supabase project URL |
| `SUPABASE_KEY` | Auth, notifications | Server-side service-role key |
| `JWT_SECRET` | Auth, roster | Shared secret used to sign and verify sessions |
| `NOTIFICATION_SERVICE_URL` | Auth, roster | Base URL of the notification service |
| `NOTIFICATION_SERVICE_KEY` | Auth, roster, notifications | Shared credential for service-to-service requests |
| `RESEND_API_KEY` | Notifications | Resend API credential |
| `NOTIFICATION_FROM` | Notifications | Verified sender name and address |
| `CLIENT_URL` | Auth, roster | Public client origin used in links |
| `CORS_ORIGINS` | All APIs | Comma-separated allowed browser origins |
| `VITE_AUTH_SERVICE_URL` | Client | Public authentication API URL |
| `VITE_ROSTER_SERVICE_URL` | Client | Public roster API URL |

Use the same `JWT_SECRET` in the auth and roster services. Use the same `NOTIFICATION_SERVICE_KEY` in all three backend services. Never commit `.env` files or paste live credentials into issues, documentation, or chat.

### 3. Prepare the database

```bash
npm --prefix roster-core-service run db:deploy
npm --prefix roster-core-service run db:generate
```

### 4. Start the application

Open four terminals and run one process in each:

```bash
npm --prefix auth-service run dev
npm --prefix roster-core-service run dev
npm --prefix notification-service run dev
npm --prefix client run dev
```

Then open `http://localhost:5173`.

Each backend exposes a health endpoint:

```text
http://localhost:4001/health
http://localhost:4002/health
http://localhost:4003/health
```

## Typical workflow

1. Create an organisation workspace and administrator account.
2. Sign in and create work units and duties.
3. Invite members and assign them to work units.
4. Generate a draft roster for a service date.
5. Review assignments and make any manual changes.
6. Publish the roster and inspect email-delivery results.
7. Members sign in, view their published work, and acknowledge each task.
8. An administrator records attendance and reviews performance.

## API overview

All protected endpoints expect `Authorization: Bearer <token>`. Administrative mutations also enforce the `admin` role.

- Authentication: `/teams`, `/register`, `/login`, `/logout`, `/me`, and `/password-reset/*`.
- Workspaces: `/subunits`, `/members`, `/duties`, and `/invitations`.
- Rosters: `/rosters`, `/rosters/generate`, `/rosters/publish`, assignment updates, attendance, and acknowledgement.
- Team requests: `/subunit-switch-requests`.
- Automation: `/recurring-schedules` and the roster automation worker.
- Internal notifications: `/notify/roster-published`, `/notify/invitation`, `/notify/password-reset`, `/notify/switch-request`, and `/notify/task-reminders`.

The full public client contract is documented in [`docs/openapi.yaml`](docs/openapi.yaml).

## Automation

The roster service can maintain a rolling schedule and process reminders:

```bash
npm --prefix roster-core-service run automation
```

Relevant roster-service variables are `AUTOMATION_ENABLED` and `AUTOMATION_INTERVAL_MS`. Production scheduling guidance is available in [`cron.md`](cron.md).

## Three checks that prove it works

Run all commands from the repository root.

1. **Backend behaviour:** `npm run test` must pass the auth, roster, and notification test suites. The current suites contain 50 passing tests.
2. **Client quality and production compilation:** `npm run lint` and `npm run build` must both exit successfully.
3. **End-to-end acceptance:** with all services and a test database running, complete the typical workflow above for two separate organisations and confirm that data never crosses workspace boundaries, publication sends and logs notifications, and a member can see and acknowledge only their own published assignments.

The combined automated command is:

```bash
npm run verify
```

At the time of writing, check 1 passes. Check 2 is blocked by unexpected obfuscated code in `client/vite.config.js`, so the application must not be considered end-to-end verified until that file is cleaned, the client checks pass, and check 3 is completed.

## Main limitation

The main limitation is the lack of a repeatable browser-level end-to-end test suite. Most backend behaviour is covered with isolated tests, but the complete client-to-API-to-database-to-email journey still depends on manual acceptance testing. The current `client/vite.config.js` issue must also be investigated and removed before running or deploying the client.

## Deployment

Deploy in this order:

1. Back up the database and apply Prisma migrations.
2. Configure production secrets, public URLs, and CORS origins.
3. Deploy `notification-service`.
4. Deploy `auth-service`.
5. Deploy `roster-core-service` and configure its automation job.
6. Deploy `client` with both public API URLs.
7. Check all three `/health` endpoints.
8. Complete the two-organisation acceptance check described above.

See [`docs/DEPLOYMENT_RUNBOOK.md`](docs/DEPLOYMENT_RUNBOOK.md) for operational details and [`docs/ADMIN_GUIDE.md`](docs/ADMIN_GUIDE.md) for administrator usage.

## Security notes

- Keep `.env` files out of version control and rotate any credential that is exposed.
- Use long, independent random values for `JWT_SECRET` and `NOTIFICATION_SERVICE_KEY`.
- Use a server-side Supabase service-role key only in backend services; never expose it through a `VITE_*` variable.
- Restrict production CORS origins to the deployed client.
- Treat member deletion as permanent: it removes the member account and associated roster history.
- Review audit and notification logs after sensitive administrative actions.

## Project status

The application implements its core multi-tenant roster workflow, recurring scheduling, reminders, acknowledgements, attendance, and invitations. Further priorities and acceptance criteria are tracked in [`BHBC_Media_Roster_Implementation_Plan.md`](BHBC_Media_Roster_Implementation_Plan.md).
