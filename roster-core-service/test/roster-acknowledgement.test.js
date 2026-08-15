const test = require("node:test");
const assert = require("node:assert/strict");

process.env.DATABASE_URL ||= "postgresql://postgres:postgres@localhost:5432/test";

const prisma = require("../src/config/prismaClient");
const { acknowledgeRoster } = require("../src/controllers/rosterController");

const responseRecorder = () => ({
  statusCode: 200,
  body: undefined,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

test("a member can acknowledge only their own published assignment", async () => {
  const originals = {
    memberFindFirst: prisma.member.findFirst,
    rosterFindFirst: prisma.roster.findFirst,
    rosterUpdate: prisma.roster.update,
    auditCreate: prisma.auditLog.create,
  };
  let assignmentWhere;
  prisma.member.findFirst = async () => ({ id: "member-1" });
  prisma.roster.findFirst = async ({ where }) => {
    assignmentWhere = where;
    return { id: "roster-1", acknowledgedAt: null };
  };
  prisma.roster.update = async () => ({ id: "roster-1", acknowledgedAt: new Date("2026-08-15T10:00:00.000Z") });
  prisma.auditLog.create = async () => ({});
  const res = responseRecorder();
  try {
    await acknowledgeRoster({ params: { id: "roster-1" }, user: { churchId: "church-1", userId: "user-1" } }, res);
    assert.deepEqual(assignmentWhere, { id: "roster-1", churchId: "church-1", memberId: "member-1", status: "published" });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.message, "Assignment acknowledged");
  } finally {
    prisma.member.findFirst = originals.memberFindFirst;
    prisma.roster.findFirst = originals.rosterFindFirst;
    prisma.roster.update = originals.rosterUpdate;
    prisma.auditLog.create = originals.auditCreate;
  }
});
