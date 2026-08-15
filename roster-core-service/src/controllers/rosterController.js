const prisma = require("../config/prismaClient");
const { generateRosterForDate } = require("../services/schedulingService");
const { recordAudit } = require("../services/auditService");
const { notify } = require("../services/notificationClient");
const { parseDateOnly } = require("../utils/date");

const rosterInclude = {
  duty: { include: { subunit: true } },
  member: { include: { user: { select: { id: true, name: true, email: true } } } },
};

const generateRoster = async (req, res) => {
  const date = parseDateOnly(req.body.serviceDate);
  if (!date) return res.status(400).json({ message: "serviceDate must use YYYY-MM-DD" });
  try {
    const results = await generateRosterForDate(req.user.churchId, req.body.serviceDate);
    await recordAudit({ churchId: req.user.churchId, actorUserId: req.user.userId, action: "roster.generated", entityType: "roster", metadata: { serviceDate: req.body.serviceDate } });
    return res.status(201).json({ message: `Roster generation complete for ${req.body.serviceDate}`, results });
  } catch (error) {
    console.error("Error generating roster", error);
    return res.status(500).json({ message: "Failed to generate roster" });
  }
};

const getRosterByDate = async (req, res) => {
  const date = parseDateOnly(req.query.date);
  if (!date) return res.status(400).json({ message: "date query parameter must use YYYY-MM-DD" });
  try {
    const where = { churchId: req.user.churchId, serviceDate: date };
    if (req.user.role !== "admin") {
      const member = await prisma.member.findFirst({ where: { userId: req.user.userId, churchId: req.user.churchId } });
      if (!member) return res.status(404).json({ message: "Member profile not found" });
      where.memberId = member.id;
      where.status = "published";
    }
    const rosterEntries = await prisma.roster.findMany({ where, include: rosterInclude, orderBy: { dutyId: "asc" } });
    return res.json({ rosterEntries });
  } catch (error) {
    console.error("Error fetching roster", error);
    return res.status(500).json({ message: "Failed to fetch roster" });
  }
};

const reassignRoster = async (req, res) => {
  const { memberId } = req.body;
  if (!memberId) return res.status(400).json({ message: "memberId is required" });
  try {
    const entry = await prisma.roster.findFirst({ where: { id: req.params.id, churchId: req.user.churchId }, include: { duty: true } });
    if (!entry) return res.status(404).json({ message: "Roster entry not found" });
    if (entry.status === "published") return res.status(409).json({ message: "Published assignments cannot be reassigned" });
    const member = await prisma.member.findFirst({ where: { id: memberId, churchId: req.user.churchId, subunitId: entry.duty.subunitId, isActive: true } });
    if (!member) return res.status(400).json({ message: "Member is not eligible for this duty" });
    const rosterEntry = await prisma.roster.update({ where: { id: entry.id }, data: { memberId }, include: rosterInclude });
    await recordAudit({ churchId: req.user.churchId, actorUserId: req.user.userId, action: "roster.reassigned", entityType: "roster", entityId: entry.id, metadata: { memberId } });
    return res.json({ message: "Assignment updated", rosterEntry });
  } catch (error) {
    console.error("Error reassigning roster", error);
    return res.status(500).json({ message: "Failed to update assignment" });
  }
};

const markAttendance = async (req, res) => {
  if (typeof req.body.attended !== "boolean") return res.status(400).json({ message: "attended must be true or false" });
  try {
    const entry = await prisma.roster.findFirst({ where: { id: req.params.id, churchId: req.user.churchId } });
    if (!entry) return res.status(404).json({ message: "Roster entry not found" });
    if (entry.status !== "published") return res.status(409).json({ message: "Attendance can only be marked on published assignments" });
    const rosterEntry = await prisma.roster.update({ where: { id: entry.id }, data: { attended: req.body.attended, attendanceMarkedAt: new Date(), attendanceMarkedBy: req.user.userId }, include: rosterInclude });
    await recordAudit({ churchId: req.user.churchId, actorUserId: req.user.userId, action: "attendance.marked", entityType: "roster", entityId: entry.id, metadata: { attended: req.body.attended } });
    return res.json({ message: "Attendance updated", rosterEntry });
  } catch (error) {
    console.error("Error marking attendance", error);
    return res.status(500).json({ message: "Failed to update attendance" });
  }
};

const publishRoster = async (req, res) => {
  const date = parseDateOnly(req.body.serviceDate);
  if (!date) return res.status(400).json({ message: "serviceDate must use YYYY-MM-DD" });
  try {
    const rosterEntries = await prisma.roster.findMany({ where: { churchId: req.user.churchId, serviceDate: date }, include: rosterInclude });
    if (!rosterEntries.length) return res.status(404).json({ message: `No roster entries found for ${req.body.serviceDate}` });
    const alreadyPublished = rosterEntries.every((entry) => entry.status === "published");
    if (!alreadyPublished) {
      await prisma.roster.updateMany({ where: { churchId: req.user.churchId, serviceDate: date }, data: { status: "published" } });
      await recordAudit({ churchId: req.user.churchId, actorUserId: req.user.userId, action: "roster.published", entityType: "roster", metadata: { serviceDate: req.body.serviceDate } });
    }

    const assignments = rosterEntries.map((entry) => ({ rosterId: entry.id, dutyName: entry.duty.name, subunitName: entry.duty.subunit.name, memberName: entry.member.user.name, memberEmail: entry.member.user.email }));
    const notification = await notify("/notify/roster-published", {
      churchId: req.user.churchId,
      serviceDate: req.body.serviceDate,
      assignments,
    });
    return res.json({
      message: alreadyPublished ? "Roster was already published; task emails were retried" : `Roster for ${req.body.serviceDate} published`,
      alreadyPublished,
      assignmentCount: assignments.length,
      notification,
    });
  } catch (error) {
    console.error("Error publishing roster", error);
    return res.status(500).json({ message: "Failed to publish roster" });
  }
};

module.exports = { generateRoster, getRosterByDate, reassignRoster, markAttendance, publishRoster };
