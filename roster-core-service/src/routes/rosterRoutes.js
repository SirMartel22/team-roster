const express = require('express');
const requireAuth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');

const { generateRoster, getRosterByDate, publishRoster } = require('../controllers/rosterController');

const router = express.Router();

router.post('/rosters/generate', requireAuth, generateRoster);
router.get('/rosters', requireAuth, getRosterByDate);
router.post('/rosters/publish', requireAuth, requireRole('admin'), publishRoster);

module.exports = router;