const test = require("node:test");
const assert = require("node:assert/strict");
const { createAuthMiddleware } = require("../src/middleware/authMiddleware");

const response = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

test("roster service accepts an active session", async () => {
  const middleware = createAuthMiddleware({
    jwtLib: { verify: () => ({ userId: "user-1", churchId: "church-1", role: "admin" }) },
    prismaClient: { revokedSession: { findFirst: async () => null } },
    jwtSecret: "secret",
  });
  let passed = false;

  await middleware({ headers: { authorization: "Bearer active-token" } }, response(), () => { passed = true; });

  assert.equal(passed, true);
});

test("roster service rejects a revoked session", async () => {
  const middleware = createAuthMiddleware({
    jwtLib: { verify: () => ({ userId: "user-1", churchId: "church-1", role: "admin" }) },
    prismaClient: { revokedSession: { findFirst: async () => ({ id: "revocation-1" }) } },
    jwtSecret: "secret",
  });
  const res = response();

  await middleware({ headers: { authorization: "Bearer revoked-token" } }, res, () => assert.fail("must not pass"));

  assert.equal(res.statusCode, 401);
  assert.match(res.body.message, /signed out/i);
});

test("roster service reports revocation storage failures as temporary rather than invalid credentials", async () => {
  const middleware = createAuthMiddleware({
    jwtLib: { verify: () => ({ userId: "user-1", churchId: "church-1", role: "admin" }) },
    prismaClient: { revokedSession: { findFirst: async () => { throw new Error("table unavailable"); } } },
    jwtSecret: "secret",
  });
  const res = response();

  await middleware({ headers: { authorization: "Bearer active-token" } }, res, () => assert.fail("must not pass"));

  assert.equal(res.statusCode, 503);
  assert.match(res.body.message, /temporarily unavailable/i);
});
