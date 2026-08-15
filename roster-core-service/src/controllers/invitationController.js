const crypto = require("crypto");
const prisma = require("../config/prismaClient");
const { recordAudit } = require("../services/auditService");
const { notify } = require("../services/notificationClient");
const { buildInvitationUrl } = require("../utils/invitationUrl");

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");
const INVITATION_PAGE_SIZE = 10;

const parseInvitationPage = (value) => {
  const page = Number.parseInt(value, 10);
  return Number.isInteger(page) && page > 0 ? page : 1;
};

const normalizeInvitationIds = (ids) => {
  if (!Array.isArray(ids)) return [];
  return [...new Set(ids.filter((id) => typeof id === "string" && id.trim()).map((id) => id.trim()))];
};

const listInvitations = async (req, res) => {
  try {
    const page = parseInvitationPage(req.query?.page);
    const where = { churchId: req.user.churchId };
    const [invitations, totalCount] = await Promise.all([
      prisma.invitation.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * INVITATION_PAGE_SIZE,
        take: INVITATION_PAGE_SIZE,
      }),
      prisma.invitation.count({ where }),
    ]);
    return res.json({
      invitations: invitations.map(({ tokenHash, ...invitation }) => invitation),
      pagination: {
        page,
        pageSize: INVITATION_PAGE_SIZE,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / INVITATION_PAGE_SIZE)),
      },
    });
  } catch (error) {
    console.error("Failed to list invitations", error);
    return res.status(500).json({ message: "Failed to list invitations" });
  }
};

const createInvitation = async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  if (!email) return res.status(400).json({ message: "email is required" });
  try {
    const existing = await prisma.invitation.findFirst({ where: { churchId: req.user.churchId, email, status: "pending", expiresAt: { gt: new Date() } } });
    if (existing) return res.status(409).json({ message: "A valid invitation is already pending for this email" });
    const token = crypto.randomBytes(32).toString("hex");
    let inviteUrl;
    try {
      inviteUrl = buildInvitationUrl(token);
    } catch (configurationError) {
      console.error("Invitation URL configuration error:", configurationError.message);
      return res.status(503).json({ message: "Invitation links are not configured for this environment" });
    }
    const invitation = await prisma.invitation.create({ data: {
      churchId: req.user.churchId,
      email,
      role: "member",
      tokenHash: hashToken(token),
      invitedBy: req.user.userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    } });
    await recordAudit({ churchId: req.user.churchId, actorUserId: req.user.userId, action: "invitation.created", entityType: "invitation", entityId: invitation.id });
    const notification = await notify("/notify/invitation", { churchId: req.user.churchId, invitationId: invitation.id, email, inviteUrl });
    return res.status(201).json({
      message: "Invitation created",
      invitation: { ...invitation, tokenHash: undefined },
      inviteUrl,
      notification,
    });
  } catch (error) {
    console.error("Failed to create invitation", error);
    return res.status(500).json({ message: "Failed to create invitation" });
  }
};

const revokeInvitation = async (req, res) => {
  try {
    const invitation = await prisma.invitation.findFirst({ where: { id: req.params.id, churchId: req.user.churchId } });
    if (!invitation) return res.status(404).json({ message: "Invitation not found" });
    if (invitation.status !== "pending") return res.status(409).json({ message: "Only pending invitations can be revoked" });
    await prisma.invitation.update({ where: { id: invitation.id }, data: { status: "revoked" } });
    await recordAudit({ churchId: req.user.churchId, actorUserId: req.user.userId, action: "invitation.revoked", entityType: "invitation", entityId: invitation.id });
    return res.json({ message: "Invitation revoked" });
  } catch (error) {
    console.error("Failed to revoke invitation", error);
    return res.status(500).json({ message: "Failed to revoke invitation" });
  }
};

const resendInvitation = async (req, res) => {
  try {
    const invitation = await prisma.invitation.findFirst({ where: { id: req.params.id, churchId: req.user.churchId } });
    if (!invitation) return res.status(404).json({ message: "Invitation not found" });
    if (invitation.status === "accepted") return res.status(409).json({ message: "Accepted invitations cannot be resent" });
    if (invitation.status === "pending") await prisma.invitation.update({ where: { id: invitation.id }, data: { status: "revoked" } });
    req.body.email = invitation.email;
    return createInvitation(req, res);
  } catch (error) {
    console.error("Failed to resend invitation", error);
    return res.status(500).json({ message: "Failed to resend invitation" });
  }
};

const deleteInvitations = async (req, res) => {
  const ids = normalizeInvitationIds(req.body?.ids);
  if (!ids.length) return res.status(400).json({ message: "Select at least one invitation to delete" });
  try {
    const result = await prisma.invitation.deleteMany({
      where: { churchId: req.user.churchId, id: { in: ids } },
    });
    await recordAudit({
      churchId: req.user.churchId,
      actorUserId: req.user.userId,
      action: "invitation.deleted",
      entityType: "invitation",
      metadata: { requestedIds: ids, deletedCount: result.count },
    });
    return res.json({
      message: `${result.count} ${result.count === 1 ? "invitation" : "invitations"} deleted`,
      deletedCount: result.count,
    });
  } catch (error) {
    console.error("Failed to delete invitations", error);
    return res.status(500).json({ message: "Failed to delete invitations" });
  }
};

module.exports = { listInvitations, createInvitation, revokeInvitation, resendInvitation, deleteInvitations, normalizeInvitationIds, parseInvitationPage, INVITATION_PAGE_SIZE };
