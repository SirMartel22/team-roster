//Defines the URL path (/register, /login) and which functions handle each
const express = require("express");
const { register, login, createTeam, getInvitation } = require("../controllers/authController");
const requireAuth = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");
const supabase = require("../config/supabaseClient");
const rateLimit = require("../middleware/rateLimit");
const { toUserDto } = require("../utils/userDto");

const router = express.Router();

router.post("/register", rateLimit({ max: 10 }), register);
router.post("/login", rateLimit({ max: 10 }), login);
router.post("/teams", rateLimit({ max: 5 }), createTeam); // public entry point for a new workspace
router.get('/invitations/:token', getInvitation);



// A simple test route to confirm the middleware works, before we build
// anything real on top of it.
router.get("/me", requireAuth, async (req, res) => {
  try {
    // req.user.userId comes from the decoded JWT — use it to fetch
    // the CURRENT, full user record from the database, rather than
    // just echoing back whatever was frozen into the token at login time.

    const { data: user, error } = await supabase
      .from("users")
      .select("id, email, name, role, church_id")
      .eq("id", req.user.userId)
      .single();

    if (error || !user) {
      return res.status(404).json({
        message: "User not found",
      });
    }
    res.json({
      message: "You are Authenticated",
      user: toUserDto(user),
      // user: req.user
    });
  } catch (error) {
    console.error("Error fetching current user:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

// Admin-only test route — requireAuth runs first (sets req.user),
// THEN requireRole('admin') checks req.user.role. Order matters here:
router.get("/admin-only", requireAuth, requireRole("admin"), (req, res) => {
  res.json({
    message: "Welcome, Admin",
    user: req.user,
  });
});

module.exports = router;
