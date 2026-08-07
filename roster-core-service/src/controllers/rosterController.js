const prisma = require("../config/prismaClient");
const { generateRosterForDate } = require("../services/schedulingService");

// const BHBC_CHURCH_ID = process.env.BHBC_CHURCH_ID;
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL;

// POST /rosters/generate - triggers the scheduling engine for a given data

const generateRoster = async (req, res) => {
  const { serviceDate } = req.body;
  const { churchId } = req.user;

  if (!serviceDate) {
    return res.status(400).json({
      message: 'serviceDate is required (e.g. "2026-07-19")',
    });
  }

  try {
    const results = await generateRosterForDate(churchId, serviceDate);

    res.status(201).json({
      message: `Roster generation complete for ${serviceDate}`,
      results,
    });
  } catch (error) {
    console.error("Error generating Roster", error);
    res.status(500).json({
      message: "Failed to generate roster",
    });
  }
};

// const prisma = require("../config/prismaClient");

// GET /rosters?date=2026-07-19 — view the roster for a specific date

const getRosterByDate = async (req, res) => {
  const { date } = req.query;
  const { churchId } = req.user;

  if (!date) {
    return res.status(400).json({
      message: "date query parameter is required",
    });
  }

  try {
    const rosterEntries = await prisma.roster.findMany({
      where: {
        churchId,
        serviceDate: new Date(date),
      },
      include: {
        duty: {
          include: {
            subunit: true,
          },
        },
        member: {
          include: {
            user: true,
          },
        },
      },
    });

    res.status(200).json({ rosterEntries });
  } catch (error) {
    console.error("Error fetching roster: ", error);
    res.status(500).json({
      message: "Failed to fetch roster",
    });
  }
};

// POST /rosters/publish — flips every roster entry for a given service_date
// from 'scheduled' to 'published', then notifies each assigned member.
const publishRoster = async (req, res) => {
  const { serviceDate } = req.body;
  const { churchId } = req.user;

  if (!serviceDate) {
    return res.status(400).json({
      message: "serviceDate is required",
    });
  }

  try {
    // Step 1: Fetch every roster entry for this date, WITH the relational
    // data we need to build meaningful notification emails — the duty name,
    // subunit name, and the member's user info (name + email).

    const rosterEntries = await prisma.roster.findMany({
      where: {
        churchId,
        serviceDate: new Date(serviceDate),
      },
      include: {
        duty: { include: { subunit: true } },
        member: { include: { user: true } },
      },
    });

    if (rosterEntries.length === 0) {
      return res.status(404).json({
        message: `No roster entries found for ${serviceDate}. Generate one first.`,
      });
    }

    // Step 2: Update every one of those entries to 'published' in one go.
    // prisma.roster.updateMany() is the bulk-update equivalent of running
    // individual .update() calls in a loop — one SQL UPDATE statement
    // instead of N separate round-trips to the database.

    await prisma.roster.updateMany({
      where: {
        churchId,
        serviceDate: new Date(serviceDate),
      },
      data: {
        status: "published",
      },
    });

    // Step 3: Build the payload notification-service expects — a flat
    // array of { rosterId, dutyName, memberName, memberEmail, subunitName }.
    // We're reshaping our nested Prisma result into exactly what the
    // OTHER service's API contract needs — this reshaping step is a
    // normal, expected part of one service talking to another; each
    // service owns its own idea of what data it needs.
    const assignments = rosterEntries.map((entry) => ({
      rosterId: entry.id,
      dutyName: entry.duty.name,
      subunitName: entry.duty.subunit.name,
      memberName: entry.member.user.name,
      memberEmail: entry.member.user.email,
    }));

    // Step 4: Call notification-service over HTTP. This is the actual
    // microservices communication pattern — roster-core-service doesn't
    // import any notification-service code, doesn't touch its database
    // tables directly (even though they're in the same Postgres instance),
    // it just sends an HTTP request, exactly like any external API call.

    const notifyResponse = await fetch(
      `${NOTIFICATION_SERVICE_URL}/notify/roster-published`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          churchId,
          serviceDate,
          assignments,
        }),
      },
    );

    const notifyData = await notifyResponse.json();

    res.status(200).json({
      message: `Roster for ${serviceDate} published and notifications sent`,
      notificationResults: notifyData,
    });
  } catch (error) {
    console.error("Error publishing roster:", error);
    res.status(500).json({
      message: "Failed to publish roster",
    });
  }
};

module.exports = { generateRoster, getRosterByDate, publishRoster };
