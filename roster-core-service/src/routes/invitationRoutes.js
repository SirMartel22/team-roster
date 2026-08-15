const express = require("express");
const requireAuth = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");
const { listInvitations, createInvitation, revokeInvitation, resendInvitation, deleteInvitations } = require("../controllers/invitationController");

const router = express.Router();
router.get("/invitations", requireAuth, requireRole("admin"), listInvitations);
router.post("/invitations", requireAuth, requireRole("admin"), createInvitation);
router.post("/invitations/bulk-delete", requireAuth, requireRole("admin"), deleteInvitations);
router.delete("/invitations/:id", requireAuth, requireRole("admin"), revokeInvitation);
router.post("/invitations/:id/resend", requireAuth, requireRole("admin"), resendInvitation);

module.exports = router;
