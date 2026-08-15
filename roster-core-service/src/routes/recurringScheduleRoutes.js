const express = require("express");
const requireAuth = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");
const { createRecurringSchedule, deleteRecurringSchedule, listRecurringSchedules, updateRecurringSchedule } = require("../controllers/recurringScheduleController");

const router = express.Router();
router.get("/recurring-schedules", requireAuth, requireRole("admin"), listRecurringSchedules);
router.post("/recurring-schedules", requireAuth, requireRole("admin"), createRecurringSchedule);
router.put("/recurring-schedules/:id", requireAuth, requireRole("admin"), updateRecurringSchedule);
router.delete("/recurring-schedules/:id", requireAuth, requireRole("admin"), deleteRecurringSchedule);

module.exports = router;
