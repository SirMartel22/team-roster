const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");

process.env.SUPABASE_URL ||= "http://localhost:54321";
process.env.SUPABASE_KEY ||= "test-key";
process.env.JWT_SECRET ||= "test-secret";

const { createAuthHandlers } = require("../src/controllers/authController");
const subunitId = "11111111-1111-4111-8111-111111111111";

const resultQuery = (result, calls) => {
  const query = {
    select(value) { calls?.push(["select", value]); return query; },
    insert(value) { calls?.push(["insert", value]); return query; },
    eq(column, value) { calls?.push(["eq", column, value]); return query; },
    order(column, value) { calls?.push(["order", column, value]); return query; },
    async single() { return result; },
  };
  return query;
};

const responseRecorder = () => ({
  statusCode: 200,
  body: undefined,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

const dependencies = (supabaseClient) => ({
  supabaseClient,
  bcryptLib: {
    async hash() { return "hashed-password"; },
    async compare(password, hash) { return password === "correct-password" && hash === "stored-hash"; },
  },
  jwtLib: { sign(payload) { return `token:${payload.userId}`; } },
  cryptoLib: crypto,
  jwtSecret: "test-secret",
});

test("login scopes the user lookup to the workspace and returns a session", async () => {
  const calls = [];
  const supabaseClient = {
    from(table) {
      calls.push(["from", table]);
      if (table === "churches") {
        return resultQuery({ data: { id: "church-1", name: "BHBC", slug: "bhbc" }, error: null }, calls);
      }
      return resultQuery({
        data: { id: "user-1", church_id: "church-1", email: "member@example.com", name: "Member", role: "member", password_hash: "stored-hash" },
        error: null,
      }, calls);
    },
  };
  const { login } = createAuthHandlers(dependencies(supabaseClient));
  const res = responseRecorder();

  await login({ body: { workspaceSlug: " BHBC ", email: " MEMBER@EXAMPLE.COM ", password: "correct-password" } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.token, "token:user-1");
  assert.deepEqual(res.body.user, { id: "user-1", churchId: "church-1", email: "member@example.com", name: "Member", role: "member" });
  assert.ok(calls.some((call) => call[0] === "eq" && call[1] === "slug" && call[2] === "bhbc"));
  assert.ok(calls.some((call) => call[0] === "eq" && call[1] === "church_id" && call[2] === "church-1"));
});

test("workspace creation uses the atomic database operation", async () => {
  const rpcCalls = [];
  const supabaseClient = {
    rpc(name, parameters) {
      rpcCalls.push([name, parameters]);
      return resultQuery({
        data: {
          team_id: "church-1", team_name: "BHBC Media", team_slug: "bhbc-media", team_created_at: "2026-08-14T00:00:00Z",
          user_id: "admin-1", user_email: "admin@example.com", user_name: "Admin", user_role: "admin", user_church_id: "church-1",
        },
        error: null,
      });
    },
  };
  const { createTeam } = createAuthHandlers(dependencies(supabaseClient));
  const res = responseRecorder();

  await createTeam({ body: { teamName: "BHBC Media", workspaceSlug: "BHBC Media", name: "Admin", email: " ADMIN@EXAMPLE.COM ", password: "password" } }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.team.slug, "bhbc-media");
  assert.equal(res.body.user.role, "admin");
  assert.equal(rpcCalls[0][0], "create_workspace_with_admin");
  assert.equal(rpcCalls[0][1].p_email, "admin@example.com");
});

test("invited registration atomically creates the user and member profile", async () => {
  const rpcCalls = [];
  const supabaseClient = {
    rpc(name, parameters) {
      rpcCalls.push([name, parameters]);
      return resultQuery({
        data: { id: "user-1", email: "invitee@example.com", name: "Invitee", role: "member", church_id: "invited-church", created_at: "2026-08-14T00:00:00Z", member_id: "member-1" },
        error: null,
      });
    },
  };
  const { register } = createAuthHandlers(dependencies(supabaseClient));
  const res = responseRecorder();

  await register({ body: {
    invitationToken: "single-use-token",
    churchId: "untrusted-client-church",
    email: "INVITEE@EXAMPLE.COM",
    password: "password",
    name: "Invitee",
    subunitId,
    phone: " +234 801 234 5678 ",
    whatsapp: " +234 809 876 5432 ",
  } }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.user.churchId, "invited-church");
  assert.equal(rpcCalls[0][0], "register_invited_user");
  assert.equal(rpcCalls[0][1].p_token_hash, crypto.createHash("sha256").update("single-use-token").digest("hex"));
  assert.equal(rpcCalls[0][1].p_email, "invitee@example.com");
  assert.equal(rpcCalls[0][1].p_subunit_id, subunitId);
  assert.equal(rpcCalls[0][1].p_phone, "+234 801 234 5678");
  assert.equal(rpcCalls[0][1].p_whatsapp, "+234 809 876 5432");
  assert.equal("p_church_id" in rpcCalls[0][1], false);
});

test("an already-used invitation is rejected without issuing a token", async () => {
  const supabaseClient = {
    rpc() {
      return resultQuery({ data: null, error: { code: "P0001", message: "INVITATION_INVALID" } });
    },
  };
  const { register } = createAuthHandlers(dependencies(supabaseClient));
  const res = responseRecorder();

  await register({ body: {
    invitationToken: "used", email: "invitee@example.com", password: "password", name: "Invitee",
    subunitId, phone: "+2348012345678", whatsapp: "+2348098765432",
  } }, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /already used/i);
  assert.equal(res.body.token, undefined);
});

test("an invalid or cross-tenant subunit is rejected without issuing a token", async () => {
  const supabaseClient = {
    rpc() {
      return resultQuery({ data: null, error: { code: "P0001", message: "SUBUNIT_INVALID" } });
    },
  };
  const { register } = createAuthHandlers(dependencies(supabaseClient));
  const res = responseRecorder();

  await register({ body: {
    invitationToken: "valid-token", email: "invitee@example.com", password: "password", name: "Invitee",
    subunitId: "22222222-2222-4222-8222-222222222222", phone: "+2348012345678", whatsapp: "+2348098765432",
  } }, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /valid work unit/i);
  assert.equal(res.body.token, undefined);
});

test("public registration without an invitation is rejected", async () => {
  const { register } = createAuthHandlers(dependencies({}));
  const res = responseRecorder();

  await register({ body: {
    churchId: "client-selected-church", email: "member@example.com", password: "password", name: "Member",
    subunitId, phone: "+2348012345678", whatsapp: "+2348098765432",
  } }, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /invitation/i);
});
