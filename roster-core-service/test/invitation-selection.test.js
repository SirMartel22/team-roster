const test = require("node:test");
const assert = require("node:assert/strict");

process.env.SUPABASE_URL ||= "http://localhost:54321";
process.env.SUPABASE_KEY ||= "test-key";

const prisma = require("../src/config/prismaClient");
const { deleteInvitations, listInvitations, normalizeInvitationIds, parseInvitationPage, INVITATION_PAGE_SIZE } = require("../src/controllers/invitationController");

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

test("invitation pagination defaults invalid pages and limits pages to ten records", () => {
  assert.equal(parseInvitationPage(undefined), 1);
  assert.equal(parseInvitationPage("0"), 1);
  assert.equal(parseInvitationPage("3"), 3);
  assert.equal(INVITATION_PAGE_SIZE, 10);
});

test("invitation listing requests only the selected ten-record page", async () => {
  const previousFindMany = prisma.invitation.findMany;
  const previousCount = prisma.invitation.count;
  let findOptions;
  prisma.invitation.findMany = async (options) => {
    findOptions = options;
    return [{ id: "invite-21", tokenHash: "private-token-hash", email: "member@example.com" }];
  };
  prisma.invitation.count = async () => 25;
  const res = responseRecorder();
  try {
    await listInvitations({ query: { page: "3" }, user: { churchId: "church-1" } }, res);
    assert.equal(findOptions.skip, 20);
    assert.equal(findOptions.take, 10);
    assert.deepEqual(res.body.pagination, { page: 3, pageSize: 10, totalCount: 25, totalPages: 3 });
    assert.equal(res.body.invitations[0].tokenHash, undefined);
  } finally {
    prisma.invitation.findMany = previousFindMany;
    prisma.invitation.count = previousCount;
  }
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
