const test = require("node:test");
const assert = require("node:assert/strict");
const { summarizeResults } = require("../src/utils/deliverySummary");

test("published-roster email results report every assignment outcome", () => {
  assert.deepEqual(
    summarizeResults([
      { status: "sent" },
      { status: "already_sent" },
      { status: "already_processing" },
      { status: "failed" },
    ]),
    { total: 4, sent: 1, alreadySent: 1, processing: 1, failed: 1 },
  );
});
