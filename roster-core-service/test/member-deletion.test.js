const test = require("node:test");
const assert = require("node:assert/strict");

process.env.DATABASE_URL ||= "postgresql://postgres:postgres@localhost:5432/test";

const prisma = require("../src/config/prismaClient");
const { deleteMember } = require("../src/controllers/memberController");

const responseRecorder = () => ({
  statusCode: 200,
  body: undefined,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

test("member removal is tenant-scoped and deletes the member account dependencies", async () => {
  const originals = {
    findFirst: prisma.member.findFirst,
    transaction: prisma.$transaction,
    auditCreate: prisma.auditLog.create,
  };
  let memberWhere;
  const operations = [];
  prisma.member.findFirst = async ({ where }) => {
    memberWhere = where;
    return { id: "member-1", userId: "user-1", user: { id: "user-1", name: "Test Member", email: "member@example.com" } };
  };
  prisma.$transaction = async (work) => work({
    notificationLog: { deleteMany: async ({ where }) => operations.push(["notifications", where]) },
    roster: { deleteMany: async ({ where }) => operations.push(["rosters", where]) },
    subunitSwitchRequest: { deleteMany: async ({ where }) => operations.push(["requests", where]) },
    passwordResetToken: { deleteMany: async ({ where }) => operations.push(["resetTokens", where]) },
    revokedSession: { deleteMany: async ({ where }) => operations.push(["sessions", where]) },
    member: { delete: async ({ where }) => operations.push(["member", where]) },
    user: { delete: async ({ where }) => operations.push(["user", where]) },
  });
  prisma.auditLog.create = async () => ({});
  const res = responseRecorder();

  try {
    await deleteMember({ params: { id: "member-1" }, user: { churchId: "church-1", userId: "admin-1" } }, res);
    assert.deepEqual(memberWhere, { id: "member-1", churchId: "church-1" });
    assert.deepEqual(operations, [
      ["notifications", { roster: { memberId: "member-1" } }],
      ["rosters", { churchId: "church-1", memberId: "member-1" }],
      ["requests", { churchId: "church-1", memberId: "member-1" }],
      ["resetTokens", { churchId: "church-1", userId: "user-1" }],
      ["sessions", { churchId: "church-1", userId: "user-1" }],
      ["member", { id: "member-1" }],
      ["user", { id: "user-1" }],
    ]);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.memberId, "member-1");
  } finally {
    prisma.member.findFirst = originals.findFirst;
    prisma.$transaction = originals.transaction;
    prisma.auditLog.create = originals.auditCreate;
  }
});

test("member removal returns not found outside the authenticated workspace", async () => {
  const previousFindFirst = prisma.member.findFirst;
  prisma.member.findFirst = async () => null;
  const res = responseRecorder();
  try {
    await deleteMember({ params: { id: "other-member" }, user: { churchId: "church-1", userId: "admin-1" } }, res);
    assert.equal(res.statusCode, 404);
    assert.equal(res.body.message, "Member not found");
  } finally {
    prisma.member.findFirst = previousFindFirst;
  }
});
