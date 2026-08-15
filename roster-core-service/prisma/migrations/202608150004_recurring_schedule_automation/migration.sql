CREATE TABLE "recurring_schedules" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "church_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "weekday" INTEGER NOT NULL,
  "start_time" TEXT NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'Africa/Lagos',
  "horizon_days" INTEGER NOT NULL DEFAULT 35,
  "auto_publish" BOOLEAN NOT NULL DEFAULT true,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "last_generated_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "recurring_schedules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "recurring_schedules_weekday_check" CHECK ("weekday" BETWEEN 0 AND 6),
  CONSTRAINT "recurring_schedules_start_time_check" CHECK ("start_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  CONSTRAINT "recurring_schedules_horizon_check" CHECK ("horizon_days" BETWEEN 31 AND 90)
);

CREATE UNIQUE INDEX "recurring_schedules_church_id_name_key" ON "recurring_schedules"("church_id", "name");
CREATE INDEX "recurring_schedules_is_active_weekday_idx" ON "recurring_schedules"("is_active", "weekday");

ALTER TABLE "recurring_schedules"
  ADD CONSTRAINT "recurring_schedules_church_id_fkey"
  FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "rosters"
  ADD COLUMN "recurring_schedule_id" UUID,
  ADD COLUMN "service_starts_at" TIMESTAMPTZ(6),
  ADD COLUMN "acknowledged_at" TIMESTAMPTZ(6);

CREATE INDEX "rosters_church_id_service_starts_at_status_idx" ON "rosters"("church_id", "service_starts_at", "status");

ALTER TABLE "rosters"
  ADD CONSTRAINT "rosters_recurring_schedule_id_fkey"
  FOREIGN KEY ("recurring_schedule_id") REFERENCES "recurring_schedules"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
