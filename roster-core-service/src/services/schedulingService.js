const prisma = require("../config/prismaClient");
const { parseDateOnly } = require("../utils/date");
const { chooseCandidate } = require("./schedulingPolicy");

const generateRosterForDate = async (churchId, serviceDate) => {
  const targetDate = parseDateOnly(serviceDate);
  if (!targetDate) throw new Error("INVALID_SERVICE_DATE");

  const [duties, members, previousRoster, historyEntries] = await Promise.all([
    prisma.duty.findMany({ where: { churchId }, include: { subunit: true }, orderBy: [{ subunitId: "asc" }, { name: "asc" }] }),
    prisma.member.findMany({ where: { churchId, isActive: true }, include: { user: true }, orderBy: { id: "asc" } }),
    prisma.roster.findFirst({ where: { churchId, serviceDate: { lt: targetDate } }, orderBy: { serviceDate: "desc" }, select: { serviceDate: true } }),
    prisma.roster.findMany({ where: { churchId, serviceDate: { lt: targetDate } }, select: { dutyId: true, memberId: true, serviceDate: true }, orderBy: { serviceDate: "desc" } }),
  ]);

  const assignedPreviousDate = new Set();
  if (previousRoster) {
    historyEntries.forEach((entry) => {
      if (entry.serviceDate.getTime() === previousRoster.serviceDate.getTime()) assignedPreviousDate.add(entry.memberId);
    });
  }

  const history = new Map();
  historyEntries.forEach((entry) => {
    const key = `${entry.dutyId}:${entry.memberId}`;
    if (!history.has(key)) history.set(key, entry.serviceDate);
  });

  const membersBySubunit = new Map();
  members.forEach((member) => {
    if (!membersBySubunit.has(member.subunitId)) membersBySubunit.set(member.subunitId, []);
    membersBySubunit.get(member.subunitId).push(member);
  });

  const assignedTodayBySubunit = new Map();
  const results = [];

  for (const duty of duties) {
    const eligibleMembers = membersBySubunit.get(duty.subunitId) || [];
    if (!eligibleMembers.length) {
      results.push({ duty, member: null, status: "skipped", reason: "No active members available for this subunit" });
      continue;
    }
    if (!assignedTodayBySubunit.has(duty.subunitId)) assignedTodayBySubunit.set(duty.subunitId, new Set());
    const assignedToday = assignedTodayBySubunit.get(duty.subunitId);
    const { member, fairnessWarning } = chooseCandidate({ duty, members: eligibleMembers, assignedToday, assignedPreviousDate, history });
    assignedToday.add(member.id);

    try {
      const rosterEntry = await prisma.roster.create({ data: { churchId, dutyId: duty.id, memberId: member.id, serviceDate: targetDate, status: "scheduled" } });
      results.push({ duty, member, status: "assigned", fairnessWarning, rosterEntry });
    } catch (error) {
      if (error.code === "P2002") results.push({ duty, member, status: "error", reason: "A roster entry for this duty and date already exists" });
      else throw error;
    }
  }
  return results;
};

module.exports = { generateRosterForDate, chooseCandidate };
