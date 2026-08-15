const test = require("node:test");
const assert = require("node:assert/strict");
const { dateOnlyInZone, isValidTimeZone, recurringDates, zonedDateTimeToUtc } = require("../src/utils/recurrence");

test("recurring Sunday dates are generated across a rolling month", () => {
  assert.deepEqual(
    recurringDates({ weekday: 0, fromDate: "2026-08-15", horizonDays: 31 }),
    ["2026-08-16", "2026-08-23", "2026-08-30", "2026-09-06", "2026-09-13"],
  );
});

test("Lagos local service time is converted to UTC", () => {
  assert.equal(zonedDateTimeToUtc("2026-08-16", "09:00", "Africa/Lagos").toISOString(), "2026-08-16T08:00:00.000Z");
  assert.equal(dateOnlyInZone(new Date("2026-08-15T23:30:00.000Z"), "Africa/Lagos"), "2026-08-16");
  assert.equal(isValidTimeZone("Not/AZone"), false);
});
