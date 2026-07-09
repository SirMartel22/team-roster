//Defines the URL path (/register, /login) and which functions handle each
const express = require('express');
const { register, login } = require('../controllers/authController');
const requireAuth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole')

const router = express.Router();

router.post('/register', register);
router.post('/login', login);

// A simple test route to confirm the middleware works, before we build
// anything real on top of it.
router.get('/me', requireAuth, (req, res) => {
    res.json({
        message: "You are Authenticated",
        user: req.user
    });
})


// Admin-only test route — requireAuth runs first (sets req.user),
// THEN requireRole('admin') checks req.user.role. Order matters here:
router.get('/admin-only', requireAuth, requireRole('admin'), (req, res) => {
    res.json({
        message: "Welcome, Admin",
        user: req.user
    });
})


module.exports = router;