const test = require("node:test");
const assert = require("node:assert/strict");

process.env.SUPABASE_URL ||= "http://localhost:54321";
process.env.SUPABASE_KEY ||= "test-key";

const prisma = require("../src/config/prismaClient");
const { deleteInvitations, normalizeInvitationIds } = require("../src/controllers/invitationController");

const responseRecorder = () => ({
  statusCode: 200,
  body: undefined,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

test("bulk invitation IDs are trimmed and de-duplicated", () => {
  assert.deepEqual(
    normalizeInvitationIds([" invite-1 ", "invite-1", "invite-2", "", null]),
    ["invite-1", "invite-2"],
  );
});

test("bulk invitation deletion is scoped to the authenticated workspace", async () => {
  const previousDeleteMany = prisma.invitation.deleteMany;
  const previousAuditCreate = prisma.auditLog.create;
  let deletionWhere;
  prisma.invitation.deleteMany = async ({ where }) => { deletionWhere = where; return { count: 2 }; };
  prisma.auditLog.create = async () => ({});
  const res = responseRecorder();
  try {
    await deleteInvitations(
      { body: { ids: ["invite-1", "invite-2"] }, user: { churchId: "church-1", userId: "admin-1" } },
      res,
    );
    assert.deepEqual(deletionWhere, {
      churchId: "church-1",
      id: { in: ["invite-1", "invite-2"] },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.deletedCount, 2);
  } finally {
    prisma.invitation.deleteMany = previousDeleteMany;
    prisma.auditLog.create = previousAuditCreate;
  }
});
