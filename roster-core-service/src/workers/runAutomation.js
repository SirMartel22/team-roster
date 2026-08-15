const dotenv = require("dotenv");

dotenv.config();

const prisma = require("../config/prismaClient");
const { runAutomationCycle } = require("../services/automationService");

runAutomationCycle()
  .then(() => console.log("Schedule automation cycle completed"))
  .catch((error) => { console.error("Schedule automation cycle failed", error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
