const test = require("node:test");
const assert = require("node:assert/strict");
const requireServiceAuth = require("../src/middleware/requireServiceAuth");

const response = () => ({
  statusCode: null,
  status(code) { this.statusCode = code; return this; },
  json() { return this; },
});

test("notification service rejects the wrong service key", () => {
  const previous = process.env.NOTIFICATION_SERVICE_KEY;
  process.env.NOTIFICATION_SERVICE_KEY = "correct-key";
  const res = response();
  requireServiceAuth({ headers: { "x-service-key": "wrong-key" } }, res, () => assert.fail("must not pass"));
  assert.equal(res.statusCode, 401);
  if (previous === undefined) delete process.env.NOTIFICATION_SERVICE_KEY; else process.env.NOTIFICATION_SERVICE_KEY = previous;
});

test("notification service accepts the configured service key", () => {
  const previous = process.env.NOTIFICATION_SERVICE_KEY;
  process.env.NOTIFICATION_SERVICE_KEY = "correct-key";
  let passed = false;
  requireServiceAuth({ headers: { "x-service-key": "correct-key" } }, response(), () => { passed = true; });
  assert.equal(passed, true);
  if (previous === undefined) delete process.env.NOTIFICATION_SERVICE_KEY; else process.env.NOTIFICATION_SERVICE_KEY = previous;
});
