const prisma = require("../config/prismaClient");
const { recordAudit } = require("../services/auditService");

const getSubunits = async (req, res) => {
  const churchId = req.user?.churchId || req.query.churchId;
  if (!churchId) return res.status(400).json({ message: "churchId is required" });
  try {
    const subunits = await prisma.subunit.findMany({ where: { churchId }, orderBy: { name: "asc" } });
    return res.json({ subunits });
  } catch (error) {
    console.error("Error fetching subunits", error);
    return res.status(500).json({ message: "Failed to fetch subunits" });
  }
};

const createSubunit = async (req, res) => {
  if (!req.body.name?.trim()) return res.status(400).json({ message: "Subunit name is required" });
  try {
    const subunit = await prisma.subunit.create({ data: { churchId: req.user.churchId, name: req.body.name.trim() } });
    await recordAudit({ churchId: req.user.churchId, actorUserId: req.user.userId, action: "subunit.created", entityType: "subunit", entityId: subunit.id });
    return res.status(201).json({ message: "Subunit created", subunit });
  } catch (error) {
    console.error("Error creating subunit", error);
    if (error.code === "P2002") return res.status(409).json({ message: "A subunit with this name already exists" });
    return res.status(500).json({ message: "Failed to create subunit" });
  }
};

const updateSubunit = async (req, res) => {
  if (!req.body.name?.trim()) return res.status(400).json({ message: "Subunit name is required" });
  try {
    const existing = await prisma.subunit.findFirst({ where: { id: req.params.id, churchId: req.user.churchId } });
    if (!existing) return res.status(404).json({ message: "Subunit not found" });
    const subunit = await prisma.subunit.update({ where: { id: existing.id }, data: { name: req.body.name.trim() } });
    await recordAudit({ churchId: req.user.churchId, actorUserId: req.user.userId, action: "subunit.updated", entityType: "subunit", entityId: subunit.id });
    return res.json({ message: "Subunit updated", subunit });
  } catch (error) {
    if (error.code === "P2002") return res.status(409).json({ message: "A subunit with this name already exists" });
    console.error("Error updating subunit", error);
    return res.status(500).json({ message: "Failed to update subunit" });
  }
};

const deleteSubunit = async (req, res) => {
  try {
    const existing = await prisma.subunit.findFirst({ where: { id: req.params.id, churchId: req.user.churchId } });
    if (!existing) return res.status(404).json({ message: "Subunit not found" });
    await prisma.subunit.delete({ where: { id: existing.id } });
    await recordAudit({ churchId: req.user.churchId, actorUserId: req.user.userId, action: "subunit.deleted", entityType: "subunit", entityId: existing.id });
    return res.json({ message: "Subunit deleted" });
  } catch (error) {
    if (error.code === "P2003") return res.status(409).json({ message: "Cannot delete a unit that still has members, duties, or requests" });
    console.error("Error deleting subunit", error);
    return res.status(500).json({ message: "Failed to delete subunit" });
  }
};

module.exports = { getSubunits, createSubunit, updateSubunit, deleteSubunit };
