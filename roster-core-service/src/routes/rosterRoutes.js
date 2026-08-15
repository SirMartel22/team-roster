const express = require('express');
const requireAuth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');

const { acknowledgeRoster, generateRoster, getRosterByDate, reassignRoster, markAttendance, publishRoster } = require('../controllers/rosterController');

const router = express.Router();

router.post('/rosters/generate', requireAuth, requireRole('admin'), generateRoster);
router.get('/rosters', requireAuth, getRosterByDate);
router.post('/rosters/publish', requireAuth, requireRole('admin'), publishRoster);
router.patch('/rosters/:id/assignment', requireAuth, requireRole('admin'), reassignRoster);
router.patch('/rosters/:id/attendance', requireAuth, requireRole('admin'), markAttendance);
router.post('/rosters/:id/acknowledge', requireAuth, acknowledgeRoster);

module.exports = router;
