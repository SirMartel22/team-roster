const prisma = require("../config/prismaClient");
const { recordAudit } = require("../services/auditService");

const getDuties = async (req, res) => {
  try {
    const duties = await prisma.duty.findMany({
      where: { churchId: req.user.churchId, ...(req.query.subunitId ? { subunitId: req.query.subunitId } : {}) },
      include: { subunit: true },
      orderBy: { name: "asc" },
    });
    return res.json({ duties });
  } catch (error) {
    console.error("Error fetching duties", error);
    return res.status(500).json({ message: "Failed to fetch duties" });
  }
};

const createDuty = async (req, res) => {
  const { subunitId, name } = req.body;
  if (!subunitId || !name?.trim()) return res.status(400).json({ message: "subunitId and name are required" });
  try {
    const subunit = await prisma.subunit.findFirst({ where: { id: subunitId, churchId: req.user.churchId } });
    if (!subunit) return res.status(404).json({ message: "Subunit not found" });
    const duty = await prisma.duty.create({ data: { churchId: req.user.churchId, subunitId, name: name.trim() } });
    await recordAudit({ churchId: req.user.churchId, actorUserId: req.user.userId, action: "duty.created", entityType: "duty", entityId: duty.id });
    return res.status(201).json({ message: "Duty created", duty });
  } catch (error) {
    console.error("Error creating duty", error);
    return res.status(500).json({ message: "Failed to create duty" });
  }
};

const deleteDuty = async (req, res) => {
  try {
    const duty = await prisma.duty.findFirst({ where: { id: req.params.id, churchId: req.user.churchId } });
    if (!duty) return res.status(404).json({ message: "Duty not found" });
    await prisma.duty.delete({ where: { id: duty.id } });
    await recordAudit({ churchId: req.user.churchId, actorUserId: req.user.userId, action: "duty.deleted", entityType: "duty", entityId: duty.id });
    return res.json({ message: "Duty deleted successfully" });
  } catch (error) {
    console.error("Error deleting duty", error);
    if (error.code === "P2003") return res.status(409).json({ message: "Cannot delete a duty with roster assignments" });
    return res.status(500).json({ message: "Failed to delete duty" });
  }
};

module.exports = { getDuties, createDuty, deleteDuty };
