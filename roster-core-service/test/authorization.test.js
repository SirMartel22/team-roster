const test = require("node:test");
const assert = require("node:assert/strict");
const requireRole = require("../src/middleware/requireRole");

const response = () => ({
  statusCode: null,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

test("admin role passes an admin-only route", () => {
  let passed = false;
  requireRole("admin")({ user: { role: "admin" } }, response(), () => { passed = true; });
  assert.equal(passed, true);
});

test("member role receives 403 on an admin-only route", () => {
  const res = response();
  requireRole("admin")({ user: { role: "member" } }, res, () => assert.fail("must not pass"));
  assert.equal(res.statusCode, 403);
});
