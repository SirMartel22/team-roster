const prisma = require("../config/prismaClient");
const { recordAudit } = require("../services/auditService");
const { notify } = require("../services/notificationClient");

const listSwitchRequests = async (req, res) => {
  try {
    const where = { churchId: req.user.churchId };
    if (req.query.status) where.status = req.query.status;
    if (req.user.role !== "admin") {
      const member = await prisma.member.findFirst({ where: { userId: req.user.userId, churchId: req.user.churchId } });
      if (!member) return res.status(404).json({ message: "Member profile not found" });
      where.memberId = member.id;
    }
    const requests = await prisma.subunitSwitchRequest.findMany({
      where,
      include: { fromSubunit: true, toSubunit: true, member: { include: { user: { select: { id: true, name: true, email: true } } } } },
      orderBy: { requestedAt: "desc" },
    });
    return res.json({ requests });
  } catch (error) {
    console.error("Failed to list switch requests", error);
    return res.status(500).json({ message: "Failed to list switch requests" });
  }
};

const createSwitchRequest = async (req, res) => {
  const { toSubunitId } = req.body;
  if (!toSubunitId) return res.status(400).json({ message: "toSubunitId is required" });
  try {
    const member = await prisma.member.findFirst({ where: { userId: req.user.userId, churchId: req.user.churchId }, include: { user: { select: { name: true } } } });
    if (!member) return res.status(404).json({ message: "Member profile not found" });
    if (member.subunitId === toSubunitId) return res.status(400).json({ message: "You already belong to this unit" });
    const target = await prisma.subunit.findFirst({ where: { id: toSubunitId, churchId: req.user.churchId } });
    if (!target) return res.status(404).json({ message: "Target unit not found" });
    const pending = await prisma.subunitSwitchRequest.findFirst({ where: { memberId: member.id, status: "pending" } });
    if (pending) return res.status(409).json({ message: "You already have a pending switch request" });
    const request = await prisma.subunitSwitchRequest.create({ data: { churchId: req.user.churchId, memberId: member.id, fromSubunitId: member.subunitId, toSubunitId } });
    await recordAudit({ churchId: req.user.churchId, actorUserId: req.user.userId, action: "switch-request.created", entityType: "subunit_switch_request", entityId: request.id });
    const admins = await prisma.user.findMany({ where: { churchId: req.user.churchId, role: "admin" }, select: { email: true, name: true } });
    const notification = await notify("/notify/switch-request", { churchId: req.user.churchId, requestId: request.id, event: "created", recipients: admins, memberName: member.user.name });
    return res.status(201).json({ message: "Switch request submitted", request, notification });
  } catch (error) {
    console.error("Failed to create switch request", error);
    return res.status(500).json({ message: "Failed to submit switch request" });
  }
};

const decideSwitchRequest = async (req, res) => {
  const { status, decisionNote } = req.body;
  if (!["approved", "rejected"].includes(status)) return res.status(400).json({ message: "status must be approved or rejected" });
  try {
    const existing = await prisma.subunitSwitchRequest.findFirst({ where: { id: req.params.id, churchId: req.user.churchId }, include: { member: { include: { user: { select: { email: true, name: true } } } }, toSubunit: true } });
    if (!existing) return res.status(404).json({ message: "Switch request not found" });
    if (existing.status !== "pending") return res.status(409).json({ message: "This request has already been decided" });

    const request = await prisma.$transaction(async (tx) => {
      if (status === "approved") await tx.member.update({ where: { id: existing.memberId }, data: { subunitId: existing.toSubunitId } });
      return tx.subunitSwitchRequest.update({ where: { id: existing.id }, data: { status, decisionNote: decisionNote || null, decidedAt: new Date(), decidedBy: req.user.userId } });
    });
    await recordAudit({ churchId: req.user.churchId, actorUserId: req.user.userId, action: `switch-request.${status}`, entityType: "subunit_switch_request", entityId: request.id });
    const notification = await notify("/notify/switch-request", { churchId: req.user.churchId, requestId: request.id, event: status, recipients: [existing.member.user], memberName: existing.member.user.name, subunitName: existing.toSubunit.name });
    return res.json({ message: `Switch request ${status}`, request, notification });
  } catch (error) {
    console.error("Failed to decide switch request", error);
    return res.status(500).json({ message: "Failed to decide switch request" });
  }
};

module.exports = { listSwitchRequests, createSwitchRequest, decideSwitchRequest };
