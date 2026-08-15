const prisma = require("../config/prismaClient");
const { recordAudit } = require("../services/auditService");
const { generateScheduleWindow } = require("../services/automationService");
const { TIME_PATTERN, isValidTimeZone } = require("../utils/recurrence");

const scheduleData = (body) => {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const weekday = Number(body.weekday);
  const startTime = typeof body.startTime === "string" ? body.startTime.trim() : "";
  const timezone = typeof body.timezone === "string" ? body.timezone.trim() : "Africa/Lagos";
  const horizonDays = body.horizonDays === undefined ? 35 : Number(body.horizonDays);
  if (!name || !Number.isInteger(weekday) || weekday < 0 || weekday > 6 || !TIME_PATTERN.test(startTime) || !isValidTimeZone(timezone) || !Number.isInteger(horizonDays) || horizonDays < 31 || horizonDays > 90) return null;
  return { name, weekday, startTime, timezone, horizonDays, autoPublish: body.autoPublish !== false, isActive: body.isActive !== false };
};

const listRecurringSchedules = async (req, res) => {
  try {
    const schedules = await prisma.recurringSchedule.findMany({ where: { churchId: req.user.churchId }, orderBy: [{ weekday: "asc" }, { startTime: "asc" }] });
    return res.json({ schedules });
  } catch (error) {
    console.error("Failed to list recurring schedules", error);
    return res.status(500).json({ message: "Failed to list recurring schedules" });
  }
};

const createRecurringSchedule = async (req, res) => {
  const data = scheduleData(req.body);
  if (!data) return res.status(400).json({ message: "Name, weekday, HH:mm start time, valid timezone, and a 31-90 day horizon are required" });
  try {
    const schedule = await prisma.recurringSchedule.create({ data: { ...data, churchId: req.user.churchId } });
    const generation = await generateScheduleWindow(schedule);
    await recordAudit({ churchId: req.user.churchId, actorUserId: req.user.userId, action: "recurring-schedule.created", entityType: "recurring-schedule", entityId: schedule.id, metadata: generation });
    return res.status(201).json({ message: "Recurring schedule created and rolling roster generated", schedule, generation });
  } catch (error) {
    console.error("Failed to create recurring schedule", error);
    if (error.code === "P2002") return res.status(409).json({ message: "A recurring schedule with this name already exists" });
    return res.status(500).json({ message: "Failed to create recurring schedule" });
  }
};

const updateRecurringSchedule = async (req, res) => {
  const data = scheduleData(req.body);
  if (!data) return res.status(400).json({ message: "Invalid recurring schedule settings" });
  try {
    const existing = await prisma.recurringSchedule.findFirst({ where: { id: req.params.id, churchId: req.user.churchId } });
    if (!existing) return res.status(404).json({ message: "Recurring schedule not found" });
    const schedule = await prisma.recurringSchedule.update({ where: { id: existing.id }, data });
    const generation = schedule.isActive ? await generateScheduleWindow(schedule) : null;
    await recordAudit({ churchId: req.user.churchId, actorUserId: req.user.userId, action: "recurring-schedule.updated", entityType: "recurring-schedule", entityId: schedule.id });
    return res.json({ message: "Recurring schedule updated", schedule, generation });
  } catch (error) {
    console.error("Failed to update recurring schedule", error);
    return res.status(500).json({ message: "Failed to update recurring schedule" });
  }
};

const deleteRecurringSchedule = async (req, res) => {
  try {
    const existing = await prisma.recurringSchedule.findFirst({ where: { id: req.params.id, churchId: req.user.churchId } });
    if (!existing) return res.status(404).json({ message: "Recurring schedule not found" });
    await prisma.recurringSchedule.delete({ where: { id: existing.id } });
    await recordAudit({ churchId: req.user.churchId, actorUserId: req.user.userId, action: "recurring-schedule.deleted", entityType: "recurring-schedule", entityId: existing.id });
    return res.json({ message: "Recurring schedule deleted; generated roster entries were preserved" });
  } catch (error) {
    console.error("Failed to delete recurring schedule", error);
    return res.status(500).json({ message: "Failed to delete recurring schedule" });
  }
};

module.exports = { createRecurringSchedule, deleteRecurringSchedule, listRecurringSchedules, scheduleData, updateRecurringSchedule };
