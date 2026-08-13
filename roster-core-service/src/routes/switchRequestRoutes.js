const express = require("express");
const requireAuth = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");
const { listSwitchRequests, createSwitchRequest, decideSwitchRequest } = require("../controllers/switchRequestController");

const router = express.Router();
router.get("/subunit-switch-requests", requireAuth, listSwitchRequests);
router.post("/subunit-switch-requests", requireAuth, createSwitchRequest);
router.patch("/subunit-switch-requests/:id", requireAuth, requireRole("admin"), decideSwitchRequest);

module.exports = router;
