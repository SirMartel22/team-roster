const { generateRosterForDate } = require("../services/schedulingService");

const BHBC_CHURCH_ID = process.env.BHBC_CHURCH_ID;

// POST /rosters/generate - triggers the scheduling engine for a given data

const generateRoster = async (req, res) => {
  const { serviceDate } = req.body;

  if (!serviceDate) {
    return res.status(400).json({
      message: 'serviceDate is required (e.g. "2026-07-19")',
    });
  }

  try {
    const results = await generateRosterForDate(BHBC_CHURCH_ID, serviceDate);

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

const prisma = require("../config/prismaClient");

// GET /rosters?date=2026-07-19 — view the roster for a specific date

const getRosterByDate = async (req, res) => {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({
      message: "date query parameter is required",
    });
  }

  try {
    const rosterEntries = await prisma.roster.findMany({
      where: {
        churchId: BHBC_CHURCH_ID,
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
  } catch (error) {
    console.error("Error fetching roster: ", error);
    res.status(500).json({
        message: 'Failed to fetch roster'
    });
  }
};

module.exports = { generateRoster, getRosterByDate };
