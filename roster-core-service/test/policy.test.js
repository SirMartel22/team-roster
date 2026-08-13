const test = require("node:test");
const assert = require("node:assert/strict");
const { parseDateOnly } = require("../src/utils/date");
const { chooseCandidate } = require("../src/services/schedulingPolicy");

test("date-only parser rejects ambiguous input", () => {
  assert.equal(parseDateOnly("08/13/2026"), null);
  assert.equal(parseDateOnly("2026-08-13").toISOString(), "2026-08-13T00:00:00.000Z");
});

test("scheduler avoids members assigned on the previous service date", () => {
  const duty = { id: "duty" };
  const members = [{ id: "a" }, { id: "b" }];
  const result = chooseCandidate({ duty, members, assignedToday: new Set(), assignedPreviousDate: new Set(["a"]), history: new Map() });
  assert.equal(result.member.id, "b");
  assert.equal(result.fairnessWarning, null);
});

test("scheduler warns when a consecutive assignment is unavoidable", () => {
  const result = chooseCandidate({ duty: { id: "duty" }, members: [{ id: "a" }], assignedToday: new Set(), assignedPreviousDate: new Set(["a"]), history: new Map() });
  assert.equal(result.member.id, "a");
  assert.match(result.fairnessWarning, /unavoidable/);
});

test("scheduler prefers a member who has never performed the duty", () => {
  const result = chooseCandidate({ duty: { id: "duty" }, members: [{ id: "a" }, { id: "b" }], assignedToday: new Set(), assignedPreviousDate: new Set(), history: new Map([["duty:a", new Date("2026-01-01")]]) });
  assert.equal(result.member.id, "b");
});
