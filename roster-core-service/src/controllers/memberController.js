const prisma = require("../config/prismaClient");
const { recordAudit } = require("../services/auditService");

const memberInclude = { subunit: true, user: { select: { id: true, email: true, name: true, role: true } } };

const getRequestMember = (userId) => prisma.member.findUnique({ where: { userId } });

const getMembers = async (req, res) => {
  try {
    const { userId, role, churchId } = req.user;
    const where = { churchId };

    if (role !== "admin") {
      const requestMember = await getRequestMember(userId);
      if (!requestMember || requestMember.churchId !== churchId) {
        return res.status(404).json({ message: "Member profile not found for this user" });
      }
      where.subunitId = requestMember.subunitId;
    }

    const members = await prisma.member.findMany({ where, include: memberInclude, orderBy: { createdAt: "desc" } });
    return res.status(200).json({ members });
  } catch (error) {
    console.error("Error fetching members", error);
    return res.status(500).json({ message: "Failed to fetch members" });
  }
};

const createMember = async (req, res) => {
  const { subunitId, phone, whatsapp } = req.body;
  const { userId, churchId, role } = req.user;

  if (!subunitId) return res.status(400).json({ message: "subunitId is required" });
  if (role !== "member") return res.status(403).json({ message: "Admin accounts do not require member profiles" });

  try {
    const existing = await getRequestMember(userId);
    if (existing) return res.status(200).json({ message: "Member profile already exists", member: existing });

    const subunit = await prisma.subunit.findFirst({ where: { id: subunitId, churchId } });
    if (!subunit) return res.status(404).json({ message: "Subunit not found" });

    const member = await prisma.member.create({
      data: { churchId, userId, subunitId, phone: phone || null, whatsapp: whatsapp || null },
      include: memberInclude,
    });
    await recordAudit({ churchId, actorUserId: userId, action: "member.created", entityType: "member", entityId: member.id });
    return res.status(201).json({ message: "Member created", member });
  } catch (error) {
    console.error("Error creating member", error);
    if (error.code === "P2002") return res.status(409).json({ message: "This user already has a member profile" });
    if (error.code === "P2003") return res.status(400).json({ message: "Referenced user or subunit does not exist" });
    return res.status(500).json({ message: "Failed to add member" });
  }
};

const getMemberById = async (req, res) => {
  try {
    const member = await prisma.member.findFirst({ where: { id: req.params.id, churchId: req.user.churchId }, include: memberInclude });
    if (!member) return res.status(404).json({ message: "Member not found" });
    if (req.user.role !== "admin" && member.userId !== req.user.userId) {
      return res.status(403).json({ message: "Insufficient permission" });
    }
    return res.status(200).json({ member });
  } catch (error) {
    console.error("Error fetching member", error);
    return res.status(500).json({ message: "Failed to fetch member" });
  }
};

const updateMember = async (req, res) => {
  const { phone, whatsapp, isActive } = req.body;
  try {
    const existing = await prisma.member.findFirst({ where: { id: req.params.id, churchId: req.user.churchId } });
    if (!existing) return res.status(404).json({ message: "Member not found" });
    const isOwner = existing.userId === req.user.userId;
    if (req.user.role !== "admin" && !isOwner) return res.status(403).json({ message: "Insufficient permission" });
    if (req.user.role !== "admin" && isActive !== undefined) {
      return res.status(403).json({ message: "Only admins can change account status" });
    }

    const member = await prisma.member.update({
      where: { id: existing.id },
      data: {
        phone: phone !== undefined ? phone : undefined,
        whatsapp: whatsapp !== undefined ? whatsapp : undefined,
        isActive: req.user.role === "admin" && isActive !== undefined ? isActive : undefined,
      },
      include: memberInclude,
    });
    await recordAudit({ churchId: req.user.churchId, actorUserId: req.user.userId, action: "member.updated", entityType: "member", entityId: member.id });
    return res.status(200).json({ message: "Member updated", member });
  } catch (error) {
    console.error("Failed to update member", error);
    return res.status(500).json({ message: "Failed to update member" });
  }
};

const getPerformance = async (req, res) => {
  try {
    const member = await prisma.member.findFirst({ where: { id: req.params.id, churchId: req.user.churchId } });
    if (!member) return res.status(404).json({ message: "Member not found" });
    if (req.user.role !== "admin" && member.userId !== req.user.userId) return res.status(403).json({ message: "Insufficient permission" });

    const entries = await prisma.roster.findMany({ where: { churchId: req.user.churchId, memberId: member.id, status: "published" }, select: { attended: true } });
    const marked = entries.filter((entry) => entry.attended !== null);
    const attended = marked.filter((entry) => entry.attended === true).length;
    const missed = marked.filter((entry) => entry.attended === false).length;
    return res.json({ performance: {
      totalPublishedAssignments: entries.length,
      markedAssignments: marked.length,
      attended,
      missed,
      unmarked: entries.length - marked.length,
      attendanceRate: marked.length ? Math.round((attended / marked.length) * 100) : null,
    } });
  } catch (error) {
    console.error("Failed to calculate performance", error);
    return res.status(500).json({ message: "Failed to calculate performance" });
  }
};

module.exports = { getMembers, createMember, getMemberById, updateMember, getPerformance };
