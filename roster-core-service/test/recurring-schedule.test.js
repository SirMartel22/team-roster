const test = require("node:test");
const assert = require("node:assert/strict");

process.env.DATABASE_URL ||= "postgresql://postgres:postgres@localhost:5432/test";

const { scheduleData } = require("../src/controllers/recurringScheduleController");

test("recurring service settings validate weekday, local time, timezone, and horizon", () => {
  assert.deepEqual(scheduleData({ name: " Sunday Service ", weekday: 0, startTime: "09:00", timezone: "Africa/Lagos", horizonDays: 35 }), {
    name: "Sunday Service", weekday: 0, startTime: "09:00", timezone: "Africa/Lagos", horizonDays: 35, autoPublish: true, isActive: true,
  });
  assert.equal(scheduleData({ name: "Bad", weekday: 7, startTime: "25:00", timezone: "Nowhere/Invalid", horizonDays: 10 }), null);
});
