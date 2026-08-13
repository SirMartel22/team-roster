# BHBC Media Roster — Implementation Plan

**Prepared:** August 13, 2026  
**Source:** `BHBC_Media_Roster_Project_Status.md` reconciled with the current repository  
**Purpose:** Review and approve the next implementation sequence before feature work resumes

**Local implementation status:** Core roadmap implementation completed on August 13, 2026. Tenant-aware auth, authorization hardening, roster planning, invitations, switch requests, attendance/performance, reliable notifications, migrations, tests, CI, and operating documentation are implemented in the working tree. Database migration, staging acceptance, production configuration, backup validation, and deployment remain controlled operational steps.

---

## 1. Product End Goal

Deliver a secure, multi-tenant roster platform in which:

- An organisation administrator can create a workspace, configure work units and duties, manage members, generate a fair roster, review it, and publish it.
- A member can join the correct organisation, see only permitted organisation data, receive published assignments, request a unit change, and view attendance/performance information.
- All organisation-owned data is isolated by `church_id` at the API and database layers.
- Publishing a roster reliably triggers notifications and records delivery outcomes.
- The system is testable, observable, documented, and safe enough for production use by multiple organisations.

The first target is a dependable end-to-end MVP. Recurring rosters, shift swaps, analytics, calendar sync, Slack, and WhatsApp are post-MVP work.

---

## 2. Current Baseline

### Implemented

- React/Vite client with a landing page, login, member signup, workspace creation, persistent session restoration, and role-aware dashboards.
- Express auth service using Supabase, bcrypt, and 30-day JWTs.
- Express roster service using Prisma for subunits, members, duties, roster generation, roster viewing, and publishing.
- Fair-rotation scheduling that prioritises never-assigned or least-recently-assigned members for each duty and distributes same-day duties across a subunit.
- Notification service using Resend and Supabase notification logs.
- Shared `church_id` data model and a shared JWT trust model between auth and roster services.
- Admin workspace creation UI, which was listed as future M7 work in the status document but now exists in the client.
- A redesigned admin/member dashboard, although roster-planning controls remain placeholders.

### Partially implemented or inconsistent

- The dashboard currently expects `user.church_id`, and both `/login` and `/me` return that shape. A single canonical API user shape is still needed to prevent future `church_id`/`churchId` drift.
- Team creation creates and signs in the first admin, but regular login still filters by the hardcoded `BHBC_CHURCH_ID`.
- Member signup creates a user and then a member profile in separate calls. The second call requires a JWT, but the client does not send one and `/register` does not issue one.
- Some admin routes are protected, but duty creation and roster generation are not admin-only.
- Tenant filtering exists on list endpoints, but several ID-based read/update/delete operations do not verify tenant ownership.
- The scheduling engine exists, but the current dashboard cannot generate, review, or publish rosters.
- Notification delivery is implemented, but the service-to-service endpoint is not authenticated.
- The repository contains no automated test suite or committed database migration history.

### Status-document corrections

- `POST /teams` must remain a public onboarding endpoint because it creates a new workspace and its first admin. It should be validated and rate-limited, not protected by an existing admin token.
- Multi-tenant login is not complete while login is tied to `BHBC_CHURCH_ID`.
- The member signup flow is not currently end-to-end complete because of the missing bearer token on `POST /members`.
- “No consecutive-date assignments” is not fully enforced. The current scheduler tracks recency per duty, not a member's assignments across all duties on the preceding service date.
- Production/deployment claims in the status document should be reverified after the foundation fixes; this plan does not assume that the deployed code matches the local working tree.

---

## 3. Decisions to Approve Before Implementation

### Decision A — Tenant-aware login

**Recommended:** add a unique workspace `slug` and authenticate with `workspaceSlug + email + password`.

Reasons:

- The schema permits the same email in different organisations.
- Email/password alone cannot identify the correct tenant without ambiguity.
- A slug works naturally in invitation links and future workspace URLs.

Alternative: make email globally unique. This is simpler but prevents separate accounts with the same email in different organisations and makes future multi-workspace membership harder.

### Decision B — Signup consistency

**Recommended MVP approach:** `/register` creates the user and returns a JWT; authenticated `POST /members` derives `userId` and `churchId` exclusively from that JWT. If profile creation fails, the client presents a resumable “complete profile” step.

Later, invitation acceptance can be moved into a database function or another transactional workflow. The immediate approach preserves service boundaries and fixes the broken client flow without pretending two HTTP services share an atomic transaction.

### Decision C — API naming convention

**Recommended:** expose camelCase JSON (`id`, `churchId`, `createdAt`) from every API and keep snake_case confined to database mappings.

### Decision D — Fairness rule

**Recommended:** define “no consecutive assignments” as “avoid assigning a member on consecutive service dates across any duty when another eligible member is available.” If no alternative exists, fill the duty and return an explicit fairness warning rather than leaving it empty.

---

## 4. Delivery Strategy

Work will proceed in small phases. Each phase must pass its acceptance criteria before the next phase starts. Database changes must be introduced through migrations and tested against non-production data before deployment.

### Phase 0 — Establish a safe working baseline

**Objective:** make current behaviour reproducible before changing contracts.

Tasks:

1. Record required environment variables for all four applications without committing secrets.
2. Add consistent `test`, `lint`, and `start` scripts where appropriate.
3. Add a minimal test harness for auth, authorization, scheduling, and client components.
4. Add a database migration workflow and baseline the current Prisma schema.
5. Document local startup order and service URLs.
6. Capture current API responses for `/register`, `/login`, `/me`, `/members`, and `/subunits` as contract fixtures.

Acceptance criteria:

- Every application starts locally from documented commands.
- Health checks pass for all backend services.
- A clean test command runs successfully, even before broad coverage is added.
- Schema changes can be applied and reproduced without manual database editing.

---

### Phase 1 — Repair authentication, onboarding, and tenant isolation

**Objective:** make account creation and login work correctly for more than one organisation and close privilege/tenant leaks.

#### 1.1 Canonical identity contract

- Return the same safe user DTO from team creation, registration, login, and `/me`.
- Standardise on camelCase API fields.
- Add a client-side normalisation step during migration so old stored sessions fail safely or are refreshed.
- Remove temporary login debug logging.

#### 1.2 Tenant-aware login

- Add a unique, URL-safe `slug` to organisations.
- Generate a collision-safe slug during team creation.
- Change login to accept `workspaceSlug`, `email`, and `password`.
- Remove `BHBC_CHURCH_ID` from all request-time authentication logic.
- Update the login UI to collect or infer the workspace slug.

#### 1.3 Safe registration and member-profile creation

- Ignore or reject client-supplied `role`; public registration always creates a member.
- Return a JWT after successful registration.
- Send that token when creating the member profile.
- In `POST /members`, derive `userId` and `churchId` from `req.user`, not the body.
- Verify that the selected subunit belongs to the authenticated organisation.
- Support retrying profile completion when user creation succeeded but member creation failed.

#### 1.4 Authorization matrix

Apply the following policy:

| Endpoint/action | Admin | Member | Public |
|---|---:|---:|---:|
| Create workspace and first admin | No existing token required | No existing token required | Yes, rate-limited |
| Register into an organisation | No | No | Temporarily yes; invitation-only later |
| List public onboarding choices | No | No | Temporary, minimal fields only |
| Create/update/delete subunits | Yes | No | No |
| Create/delete duties | Yes | No | No |
| Generate/publish roster | Yes | No | No |
| View organisation roster | Yes | Own assignment/subunit policy | No |
| List members | All tenant members | Own subunit | No |
| View/update member | Any member in tenant | Own profile only | No |
| Change member active status/unit directly | Yes | No | No |

- Add reusable tenant ownership checks for records addressed by ID.
- Never accept an authoritative `churchId` from an authenticated request body or query.
- Fix response fall-throughs and the duty deletion `err`/`error` bug.
- Return a consistent error shape and appropriate 400/401/403/404/409 responses.

Acceptance criteria:

- Two organisations can create accounts and log in independently.
- Duplicate emails across two organisations authenticate only within the selected workspace.
- A public caller cannot choose the admin role.
- A member cannot create duties, generate/publish rosters, access another tenant, or update another member.
- A failed member-profile creation can be retried without creating a second user.
- Automated tests cover successful and rejected cases in the authorization matrix.

---

### Phase 2 — Complete the core roster workflow in the dashboard

**Objective:** make the existing roster engine usable end to end.

#### 2.1 Admin setup and management

- Add an initial setup state for a newly created workspace.
- Allow admins to create, rename, and deactivate subunits as supported by the schema.
- Allow admins to create and remove duties within a subunit.
- Show validation and conflict errors without requiring a page reload.

#### 2.2 Roster planning

- Add a service-date picker.
- Generate a draft roster using the authenticated organisation.
- Show assigned and skipped duties, fairness warnings, and generation conflicts.
- Add an explicit review step before publishing.
- Decide whether MVP needs manual reassignment. If included, add a guarded admin endpoint and audit entry.

#### 2.3 Roster viewing

- Admin: view all assignments for a selected date, grouped by subunit.
- Member: view only assignments allowed by the approved policy, with their own assignment highlighted.
- Show `scheduled` versus `published` status clearly.
- Prevent duplicate generation for an existing duty/date and provide a useful recovery action.

#### 2.4 Scheduling correctness

- Enforce tenant filters on both duties and eligible members.
- Implement the approved consecutive-date rule.
- Make tie-breaking deterministic.
- Reduce avoidable per-member database queries where practical.
- Define date handling as date-only in the organisation’s agreed timezone and test boundary cases.

Acceptance criteria:

- An admin can configure units/duties, generate a draft, review it, and publish it from the UI.
- A member cannot generate or publish a roster and sees only permitted assignments.
- Publishing the same roster twice is idempotent or is rejected clearly.
- Scheduling tests cover empty subunits, more duties than members, inactive members, tie-breaking, duplicate dates, two-tenant isolation, and consecutive-date avoidance.

---

### Phase 3 — Make notification publishing reliable

**Objective:** ensure publishing and email delivery are secure, observable, and recoverable.

Tasks:

1. Authenticate roster-service calls to notification-service with a service secret or signed service token.
2. Validate and escape notification payload content.
3. Use a verified sender domain and environment-specific sender address.
4. Check downstream HTTP status before reporting notification success.
5. Separate roster publication status from notification delivery status.
6. Add idempotency so retries do not send duplicate emails accidentally.
7. Add an admin-visible summary of sent, failed, and retryable notifications.
8. Add a retry mechanism for failed deliveries.

Acceptance criteria:

- Unauthenticated callers cannot trigger notification sends.
- A roster remains published even if some emails fail, with failures visible and retryable.
- Retrying a request does not duplicate already successful sends.
- Every attempted delivery has a queryable log tied to the correct tenant and roster entry.

---

### Phase 4 — Invitations and controlled member onboarding

**Objective:** replace broad public organisation discovery with controlled invitations.

Tasks:

1. Add an `invitations` model with tenant, email, role, expiry, inviter, status, and a hashed single-use token.
2. Add admin endpoints to create, list, revoke, and resend invitations.
3. Send invitation links through notification-service.
4. Build an acceptance page that preselects the organisation and permits an allowed subunit choice.
5. Expire or consume the token atomically on successful registration.
6. After rollout, restrict or remove public organisation/subunit enumeration.

Acceptance criteria:

- An invitation cannot be reused, used after expiry, or used for another email/tenant.
- A member cannot self-assign an elevated role.
- Admins can see pending, accepted, expired, and revoked invitations.

---

### Phase 5 — Subunit switch requests

**Objective:** give members a controlled way to request a transfer and admins a safe approval flow.

Data model:

- `id`, `churchId`, `memberId`, `fromSubunitId`, `toSubunitId`
- `status`: `pending`, `approved`, or `rejected`
- `requestedAt`, `decidedAt`, `decidedBy`, and optional `decisionNote`

Tasks:

1. Member endpoint to submit a request using identity from the JWT.
2. Prevent same-unit requests and multiple simultaneous pending requests.
3. Admin endpoint to list tenant-scoped pending/history requests.
4. Transactionally approve a request and update the member’s subunit.
5. Build member request/history UI and admin review UI.
6. Notify the appropriate recipients on request and decision.

Acceptance criteria:

- Members can request only for themselves and only within their organisation.
- Only an organisation admin can approve or reject its requests.
- Approval updates membership exactly once and preserves a decision audit trail.

---

### Phase 6 — Attendance and member performance

**Objective:** allow admins to record attendance and members to see transparent participation metrics.

Tasks:

1. Add nullable attendance state to roster entries, plus `markedAt` and `markedBy`.
2. Add admin-only attendance update and date/subunit listing endpoints.
3. Add a member performance endpoint scoped to the authenticated user, with an admin option for tenant members.
4. Define metrics precisely: total published assignments, marked assignments, attended count, missed count, unmarked count, and attendance rate.
5. Build admin attendance entry UI and member performance UI.
6. Add audit logging for attendance corrections.

Acceptance criteria:

- Unmarked assignments do not count as absences.
- Members can view only their own performance unless they are admins.
- Calculations are covered by tests for zero assignments, partially marked history, and tenant isolation.

---

### Phase 7 — Production hardening and release readiness

**Objective:** move from a functional MVP to a supportable production release.

Tasks:

- Add rate limiting to login, registration, workspace creation, invitation, and notification entry points.
- Review CORS allowlists and request-size limits.
- Reassess token storage and add a revocation/session strategy; prefer secure cookies if the deployment architecture supports them.
- Review Supabase RLS policies against the service-role usage model.
- Add audit logs for team creation, permission changes, roster generation/publishing, membership changes, and attendance edits.
- Add structured logs, request IDs, error monitoring, uptime checks, and alerts.
- Define database backup, restore testing, rollback, and disaster-recovery procedures.
- Add CI checks for lint, unit tests, integration tests, and builds.
- Produce OpenAPI documentation, deployment runbook, admin guide, and member onboarding guide.
- Run a two-tenant staging acceptance test before production deployment.

Release gate:

- No known critical or high-severity authorization defects.
- All core journey tests pass in staging.
- Backup restoration and application rollback procedures have been exercised.
- Production configuration uses verified domains, restricted origins, and no test credentials.

---

## 5. Test Strategy

### Unit tests

- JWT and role middleware.
- Validation and user DTO mapping.
- Scheduling selection, fairness, tie-breaking, and edge cases.
- Attendance/performance calculations.

### API integration tests

- Registration, login, `/me`, and profile completion.
- Every role/tenant boundary in the authorization matrix.
- Roster generate/view/publish lifecycle.
- Notification authentication, idempotency, logging, and partial failure.
- Invitation and subunit-switch state transitions.

### Client tests

- Session restore and expired-token handling.
- Join/create/login flows.
- Role-aware navigation and protected actions.
- Loading, empty, partial-failure, and retry states.
- Admin roster planning and member assignment views.

### End-to-end journeys

1. Create Organisation A and its admin.
2. Configure units and duties.
3. Invite/register members.
4. Generate, review, and publish a roster.
5. Confirm member visibility and notification logs.
6. Repeat for Organisation B using duplicate email test data where appropriate.
7. Attempt cross-tenant and member-to-admin actions and verify rejection.

---

## 6. Proposed Work Order

| Order | Deliverable | Dependency | Review checkpoint |
|---:|---|---|---|
| 1 | Safe baseline and tests | None | Local services and test harness verified |
| 2 | Tenant-aware auth and canonical user contract | Baseline | Two-tenant login demonstrated |
| 3 | Signup/profile completion and authorization hardening | Auth contract | Authorization test matrix passes |
| 4 | Admin setup and complete roster dashboard | Secure APIs | Draft-to-publish UI demonstrated |
| 5 | Notification reliability | Publish workflow | Failure/retry/idempotency demonstrated |
| 6 | Invitations | Stable onboarding | Single-use invite journey demonstrated |
| 7 | Subunit switch requests | Secure membership APIs | Request/decision journey demonstrated |
| 8 | Attendance and performance | Stable roster history | Metrics and marking UI demonstrated |
| 9 | Production hardening | Completed MVP | Staging release gate passed |

---

## 7. Definition of Done for Each Work Item

A work item is complete only when:

- The implementation matches the approved API and data contract.
- Tenant and role behavior is explicitly tested.
- Error, empty, loading, and retry states are handled where applicable.
- Database changes include a reversible migration or documented rollback.
- Automated tests pass and the affected applications build successfully.
- Relevant project/API documentation is updated.
- No unrelated user changes are overwritten.
- The feature is demonstrated against at least two tenant datasets when multi-tenancy is involved.

---

## 8. First Implementation Slice After Approval

The recommended first slice is deliberately narrow:

1. Establish the test harness and record current auth contracts.
2. Add the organisation slug migration and backfill existing organisations.
3. Standardise user responses on camelCase.
4. Replace hardcoded BHBC login with slug-scoped login.
5. Update the client login and session restoration flows.
6. Add two-tenant authentication tests.

This slice should be reviewed and merged before modifying signup/member creation. It removes the most fundamental multi-tenant blocker while keeping the change set understandable and reversible.

---

## 9. Review Questions

Please approve or revise these points before implementation begins:

1. Use a workspace slug for tenant-aware login, or make email globally unique?
2. Keep public join-team registration temporarily, or move directly to invitation-only onboarding?
3. Should members see only their own published assignments or their whole subunit’s published roster?
4. Should manual roster reassignment be included in the MVP planning screen?
5. Confirm the consecutive-date fairness definition proposed in Decision D.
6. Should the product continue using the database term `church`, while presenting “organisation/workspace” only in the UI, or should the data model eventually be renamed?

No feature implementation should begin until the Phase 1 decisions and the first implementation slice are approved.
