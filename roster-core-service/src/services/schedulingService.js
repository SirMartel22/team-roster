const prisma = require("../config/prismaClient");

const pickNextMemberForDuty = async (duryId, eligibleMembers) => {
  const membersWithLastAssignment = await Promise.all(
    eligibleMembers.map(async (member) => {
      const lastAssignment = await prisma.roster.findFirst({
        where: {
          dutyId: dutyId,
          memberId: member.id,
        },
        orderBy: {
          serviceDate: "desc", //most recent first
        },
      });

      return {
        member,
        // If lastAssignment is null (never assigned), lastDate stays null.
        // We treat null as "infinitely long ago" when sorting below.
        lastDate: lastAssignment ? lastAssignment.serviceDate : null,
      };
    }),
  );

  // Sort: members with lastDate === null (never assigned) come first.
  // Among members who HAVE been assigned before, earlier dates come first
  // (oldest assignment = most "due" for a repeat turn).

  membersWithLastAssignment.sort((a, b) => {
    if (a.lastDate === null && b.lastDate === null) return 0;
    if (a.lastDate === null) return -1; // a comes first (never assigned beats any date)
    if (b.lastDate === null) return 1; //b comes firsr
    return a.lastDate - b.lastDate; // both have dates: earlier date comes first
  });

  //The front of the sorted list is who gets picked
  return membersWithLastAssignment[0].member;
}

  // Generate a full roster for one service_date: for every Duty defined
  // in the system, assign the next fair-rotation member.

  const generateRosterForDate = async(churchId, serviceDate) => {
     // Get every duty defined for this church (across all subunits) —
    // e.g., "Lead Camera" (Videography), "Livestream Operator" (Videography),
    // "Lead Photographer" (Photography), etc.
    const duties = await prisma.duty.findMany({
        where: { churchId },
        include: { subunit: true },
    });

    const results = []; // will collect { duty, member, success/error } for reporting

    for (const duty of duties){
          // Only active members within the SAME subunit as this duty are
        // eligible — e.g., only Videography members can be assigned to
        // Videography duties.
        const eligibleMembers = await prisma.member.findMany({
            where: {
                subuniId: duty.subunitId,
                isActive: true,
            },
            include: { user: true },
        });

        if(eligibleMembers.length === 0){
            // No active members in this subunit at all — skip this duty,
            // but record it so the admin knows this duty couldn't be filled.
            results.push({
                duty,
                member: null,
                status: 'skipped',
                reason: 'No active members available for this subunit',
            });
            continue; //move to the next duty
        }

        const chosenMember = await pickNextMemberForDuty(duty.id, eligibleMembers);

        try{
             // Create the actual Roster row.
            // Recall our schema's UNIQUE(duty_id, service_date) constraint —
            // if a roster entry for this duty+date already exists, this will
            // throw, which we catch below rather than silently double-booking.
            const rosterEntry = await prisma.roster.create({
                data: {
                    churchId,
                    dutyId: duty.id,
                    memberId: chosenMember.id,
                    serviceDate: new Date(serviceDate),
                    status: 'scheduled',
                },
                include: { 
                    member: {
                        include: {
                            user: true
                        }
                    },
                    duty: true
                },
            });

            results.push({
                duty,
                member: chosenMember,
                status: 'assigned',
                rosterEntry,
            });

        } catch(error){
            if(error.code === 'P2002'){
                 // Unique constraint violation — a roster entry for this exact
                // duty+date combination already exists (e.g., someone already
                // generated this date's roster before).
                results.push({
                    duty,
                    member: chosenMember,
                    status: 'error',
                    reason: 'A roster entry for this duty and date already exists',
                });
            } else {
                throw error
                console.error('Error', error.message)
            }
        }
    }
    return results;
  };


module.exports = { generateRosterForDate, pickNextMemberForDuty}
