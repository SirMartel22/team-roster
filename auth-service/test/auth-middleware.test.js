const test = require("node:test");
const assert = require("node:assert/strict");

process.env.SUPABASE_URL ||= "http://localhost:54321";
process.env.SUPABASE_KEY ||= "test-key";
process.env.JWT_SECRET ||= "test-secret";

const { createAuthMiddleware } = require("../src/middleware/authMiddleware");

const response = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

const revokedQuery = (data, error = null) => {
  const query = {
    select() { return query; },
    eq() { return query; },
    gt() { return query; },
    async maybeSingle() { return { data, error }; },
  };
  return query;
};

test("auth service accepts an active session and exposes its raw token to logout", async () => {
  const middleware = createAuthMiddleware({
    jwtLib: { verify: () => ({ userId: "user-1", churchId: "church-1", role: "member" }) },
    supabaseClient: { from: () => revokedQuery(null) },
    jwtSecret: "secret",
  });
  const req = { headers: { authorization: "Bearer active-token" } };
  let passed = false;

  await middleware(req, response(), () => { passed = true; });

  assert.equal(passed, true);
  assert.equal(req.authToken, "active-token");
});

test("auth service rejects a revoked session", async () => {
  const middleware = createAuthMiddleware({
    jwtLib: { verify: () => ({ userId: "user-1", churchId: "church-1", role: "member" }) },
    supabaseClient: { from: () => revokedQuery({ id: "revocation-1" }) },
    jwtSecret: "secret",
  });
  const res = response();

  await middleware({ headers: { authorization: "Bearer revoked-token" } }, res, () => assert.fail("must not pass"));

  assert.equal(res.statusCode, 401);
  assert.match(res.body.message, /signed out/i);
});

test("auth service reports revocation storage failures as temporary rather than invalid credentials", async () => {
  const middleware = createAuthMiddleware({
    jwtLib: { verify: () => ({ userId: "user-1", churchId: "church-1", role: "member" }) },
    supabaseClient: { from: () => revokedQuery(null, { code: "42P01" }) },
    jwtSecret: "secret",
  });
  const res = response();

  await middleware({ headers: { authorization: "Bearer active-token" } }, res, () => assert.fail("must not pass"));

  assert.equal(res.statusCode, 503);
  assert.match(res.body.message, /temporarily unavailable/i);
});
