const prisma = require("../config/prismaClient");

// Given a duty and a candidate list of eligible members, figure out who
// should be assigned — prioritizing:
// 1. Members NOT already assigned something else today (in this subunit)
// 2. Among remaining candidates, whoever has gone longest without doing
//    THIS SPECIFIC duty (or never done it)

const pickNextMemberForDuty = async (
  dutyId,
  eligibleMembers,
  alreadyAssignedTodayIds,
) => {
  const availableToday = eligibleMembers.filter(
    (member) => !alreadyAssignedTodayIds.has(member.id),
  );

  // If everyone eligible has already been assigned something today
  // (e.g. a subunit with only 1-2 active members and 3+ duties),
  // fall back to allowing repeats rather than leaving the duty unfilled.

  const candidatePool =
    availableToday.length > 0 ? availableToday : eligibleMembers;

  //  recency-based sort operating on the
  // narrowed-down candidate pool instead of everyone.

  const membersWithLastAssignment = await Promise.all(
    candidatePool.map(async (member) => {
      const lastAssignment = await prisma.roster.findFirst({
        where: {
          dutyId: dutyId,
          memberId: member.id,
        },
        orderBy: {
          serviceDate: "desc",
        },
      });

      return {
        member,
        lastDate: lastAssignment ? lastAssignment.serviceDate : null,
      };
    }),
  );

  membersWithLastAssignment.sort((a, b) => {
    if (a.lastDate === null && b.lastDate === null) return 0;
    if (a.lastDate === null) return -1;
    if (b.lastDate === null) return 1;
    return a.lastDate - b.lastDate;
  });

  return membersWithLastAssignment[0].member;
};

const generateRosterForDate = async (churchId, serviceDate) => {
  const duties = await prisma.duty.findMany({
    where: { churchId },
    include: { subunit: true },
  });

  const results = [];

  // NEW: track who's already been assigned something today, PER SUBUNIT.
  // Using a Map keyed by subunitId -> Set of memberIds, since "already
  // assigned today" should only block someone within their OWN subunit —
  // a Videography member being busy doesn't affect Photography's picks.
  const assignedTodayBySubunit = new Map();

  for (const duty of duties) {
    const eligibleMembers = await prisma.member.findMany({
      where: {
        subunitId: duty.subunitId,
        isActive: true,
      },
      include: { user: true },
    });

    if (eligibleMembers.length === 0) {
      results.push({
        duty,
        member: null,
        status: "skipped",
        reason: "No Active members available for this subunit",
      });
      continue;
    }

    // Get (or initialize) the set of members already used today for
    // this specific subunit.

    if (!assignedTodayBySubunit.has(duty.subunitId)) {
      assignedTodayBySubunit.set(duty.subunitId, new Set());
    }

    const alreadyAssignedTodayIds = assignedTodayBySubunit.get(duty.subunitId);

    const chosenMember = await pickNextMemberForDuty(
      duty.id,
      eligibleMembers,
      alreadyAssignedTodayIds,
    );

    // Record that this member is now "used" for today, within this subunit —
    // so the NEXT duty in the same subunit knows to prefer someone else.

    alreadyAssignedTodayIds.add(chosenMember.id);

    try {
      const rosterEntry = await prisma.roster.create({
        data: {
          churchId,
          dutyId: duty.id,
          memberId: chosenMember.id,
          serviceDate: new Date(serviceDate),
          status: "scheduled",
        },
      });
      results.push({
        duty,
        member: chosenMember,
        status: "assigned",
        rosterEntry,
      });
    } catch (error) {
      if (error.code === "P2002") {
        results.push({
          duty,
          member: chosenMember,
          status: "error",
          reason: "A roster entry for this duty and date already exists",
        });
        // console.error(error);
      } else {
        throw error;
      }
    }
  }

  return results;
};


module.exports = { generateRosterForDate, pickNextMemberForDuty };
