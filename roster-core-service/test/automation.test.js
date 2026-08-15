const test = require("node:test");
const assert = require("node:assert/strict");

process.env.DATABASE_URL ||= "postgresql://postgres:postgres@localhost:5432/test";

const { needsPublishedNotification, selectReminderHours } = require("../src/services/automationService");

test("reminder windows select 24-hour and 4-hour reminders", () => {
  const now = new Date("2026-08-15T08:00:00.000Z");
  assert.equal(selectReminderHours(new Date("2026-08-16T07:00:00.000Z"), now), 24);
  assert.equal(selectReminderHours(new Date("2026-08-15T11:30:00.000Z"), now), 4);
  assert.equal(selectReminderHours(new Date("2026-08-16T09:00:00.000Z"), now), null);
  assert.equal(selectReminderHours(new Date("2026-08-15T07:00:00.000Z"), now), null);
});

test("automatic publication retries missing and failed assignment emails", () => {
  assert.equal(needsPublishedNotification({ notificationLogs: [] }), true);
  assert.equal(needsPublishedNotification({ notificationLogs: [{ status: "failed" }] }), true);
  assert.equal(needsPublishedNotification({ notificationLogs: [{ status: "sent" }] }), false);
  assert.equal(needsPublishedNotification({ notificationLogs: [{ status: "pending" }] }), false);
});
