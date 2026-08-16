const prisma = require("../config/prismaClient");
const { generateRosterForDate } = require("./schedulingService");
const { notify } = require("./notificationClient");
const { notifyPublishedAssignments } = require("./taskNotificationService");
const { dateOnlyInZone, recurringDates, zonedDateTimeToUtc } = require("../utils/recurrence");

const automationRosterInclude = {
  duty: { include: { subunit: true } },
  member: { include: { user: { select: { name: true, email: true } } } },
  recurringSchedule: { select: { timezone: true } },
  notificationLogs: { where: { eventType: "roster-published" }, select: { status: true } },
};

const selectReminderHours = (serviceStartsAt, now) => {
  const hoursUntil = (serviceStartsAt.getTime() - now.getTime()) / (60 * 60 * 1000);
  if (hoursUntil <= 0 || hoursUntil > 24) return null;
  return hoursUntil <= 4 ? 4 : 24;
};

const needsPublishedNotification = (entry) => !entry.notificationLogs.some(({ status }) => ["sent", "pending"].includes(status));

const generateScheduleWindow = async (schedule, now = new Date()) => {
  const fromDate = dateOnlyInZone(now, schedule.timezone);
  const dates = recurringDates({ weekday: schedule.weekday, fromDate, horizonDays: schedule.horizonDays });
  let generatedAssignments = 0;
  let publishedAssignments = 0;

  for (const serviceDate of dates) {
    const serviceStartsAt = zonedDateTimeToUtc(serviceDate, schedule.startTime, schedule.timezone);
    const results = await generateRosterForDate(schedule.churchId, serviceDate, {
      recurringScheduleId: schedule.id,
      serviceStartsAt,
    });
    generatedAssignments += results.filter(({ status }) => status === "assigned").length;

    if (schedule.autoPublish) {
      const entries = await prisma.roster.findMany({
        where: { churchId: schedule.churchId, recurringScheduleId: schedule.id, serviceDate: new Date(`${serviceDate}T00:00:00.000Z`) },
        include: automationRosterInclude,
      });
      const unpublished = entries.filter(({ status }) => status !== "published");
      if (unpublished.length) {
        await prisma.roster.updateMany({ where: { id: { in: unpublished.map(({ id }) => id) } }, data: { status: "published" } });
        publishedAssignments += unpublished.length;
      }
      const needingNotification = entries.filter(needsPublishedNotification);
      if (needingNotification.length) await notifyPublishedAssignments(schedule.churchId, serviceDate, needingNotification);
    }
  }

  await prisma.recurringSchedule.update({ where: { id: schedule.id }, data: { lastGeneratedAt: now } });
  return { dates: dates.length, generatedAssignments, publishedAssignments };
};

const generateAllScheduleWindows = async (now = new Date()) => {
  const schedules = await prisma.recurringSchedule.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" } });
  const results = [];
  for (const schedule of schedules) {
    try {
      results.push({ scheduleId: schedule.id, ...(await generateScheduleWindow(schedule, now)) });
    } catch (error) {
      console.error("Recurring schedule generation failed", { scheduleId: schedule.id, message: error.message });
      results.push({ scheduleId: schedule.id, error: error.message });
    }
  }
  return results;
};

const reminderTaskUrl = () => {
  try { return process.env.CLIENT_URL ? new URL("/", process.env.CLIENT_URL).toString() : undefined; }
  catch { return undefined; }
};

const sendDueReminders = async (now = new Date()) => {
  const entries = await prisma.roster.findMany({
    where: {
      status: "published",
      acknowledgedAt: null,
      serviceStartsAt: { gt: now, lte: new Date(now.getTime() + 24 * 60 * 60 * 1000) },
    },
    include: automationRosterInclude,
  });
  const buckets = new Map([[24, []], [4, []]]);
  for (const entry of entries) {
    const reminderHours = selectReminderHours(entry.serviceStartsAt, now);
    if (!reminderHours) continue;
    buckets.get(reminderHours).push({
      rosterId: entry.id,
      churchId: entry.churchId,
      dutyName: entry.duty.name,
      subunitName: entry.duty.subunit.name,
      memberName: entry.member.user.name,
      memberEmail: entry.member.user.email,
      serviceStartsAt: entry.serviceStartsAt.toISOString(),
      timezone: entry.recurringSchedule?.timezone || "UTC",
    });
  }
  const results = [];
  for (const [reminderHours, assignments] of buckets) {
    if (!assignments.length) continue;
    results.push(await notify("/notify/task-reminders", {
      reminderHours,
      taskUrl: reminderTaskUrl(),
      assignments,
    }));
  }
  return results;
};

let automationRunning = false;
const runAutomationCycle = async ({ throwOnError = false } = {}) => {
  if (automationRunning) return;
  automationRunning = true;
  try {
    const generationResults = await generateAllScheduleWindows();
    await sendDueReminders();
    const failedSchedules = generationResults.filter(({ error }) => error);
    if (failedSchedules.length) throw new Error(`${failedSchedules.length} recurring schedule generation job(s) failed`);
  } catch (error) {
    console.error("Schedule automation cycle failed", { message: error.message });
    if (throwOnError) throw error;
  } finally {
    automationRunning = false;
  }
};

const startAutomationWorker = () => {
  if (process.env.AUTOMATION_ENABLED === "false") return null;
  const intervalMs = Number(process.env.AUTOMATION_INTERVAL_MS) || 15 * 60 * 1000;
  const initialTimer = setTimeout(runAutomationCycle, 5_000);
  const interval = setInterval(runAutomationCycle, intervalMs);
  initialTimer.unref?.();
  interval.unref?.();
  return interval;
};

module.exports = { generateAllScheduleWindows, generateScheduleWindow, needsPublishedNotification, runAutomationCycle, selectReminderHours, sendDueReminders, startAutomationWorker };
