-- Tenant-aware authentication and remaining MVP feature schema.
ALTER TABLE "churches" ADD COLUMN IF NOT EXISTS "slug" TEXT;

WITH slug_candidates AS (
  SELECT
    id,
    COALESCE(NULLIF(TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER(name), '[^a-z0-9]+', '-', 'g')), ''), 'workspace') AS base_slug,
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(NULLIF(TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER(name), '[^a-z0-9]+', '-', 'g')), ''), 'workspace')
      ORDER BY created_at NULLS LAST, id
    ) AS position
  FROM "churches"
  WHERE slug IS NULL
)
UPDATE "churches" AS church
SET slug = CASE
  WHEN candidate.position = 1 THEN candidate.base_slug
  ELSE candidate.base_slug || '-' || candidate.position::TEXT
END
FROM slug_candidates AS candidate
WHERE church.id = candidate.id;

ALTER TABLE "churches" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "churches_slug_key" ON "churches"("slug");

ALTER TABLE "rosters"
  ADD COLUMN IF NOT EXISTS "attended" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "attendance_marked_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "attendance_marked_by" UUID;

ALTER TABLE "notifications_logs"
  ALTER COLUMN "roster_id" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "idempotency_key" TEXT,
  ADD COLUMN IF NOT EXISTS "error_message" TEXT,
  ADD COLUMN IF NOT EXISTS "recipient" TEXT,
  ADD COLUMN IF NOT EXISTS "event_type" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "notifications_logs_idempotency_key_key"
  ON "notifications_logs"("idempotency_key") WHERE "idempotency_key" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "invitations" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "church_id" UUID NOT NULL REFERENCES "churches"("id"),
  "email" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'member',
  "token_hash" TEXT NOT NULL UNIQUE,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "invited_by" UUID NOT NULL,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "accepted_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "invitations_church_id_status_idx" ON "invitations"("church_id", "status");

CREATE TABLE IF NOT EXISTS "subunit_switch_requests" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "church_id" UUID NOT NULL REFERENCES "churches"("id"),
  "member_id" UUID NOT NULL REFERENCES "members"("id"),
  "from_subunit_id" UUID NOT NULL REFERENCES "subunits"("id"),
  "to_subunit_id" UUID NOT NULL REFERENCES "subunits"("id"),
  "status" TEXT NOT NULL DEFAULT 'pending',
  "decision_note" TEXT,
  "requested_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "decided_at" TIMESTAMPTZ,
  "decided_by" UUID
);
CREATE INDEX IF NOT EXISTS "subunit_switch_requests_church_id_status_idx"
  ON "subunit_switch_requests"("church_id", "status");

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "church_id" UUID NOT NULL REFERENCES "churches"("id"),
  "actor_user_id" UUID,
  "action" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" UUID,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "audit_logs_church_id_created_at_idx" ON "audit_logs"("church_id", "created_at");
