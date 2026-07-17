const express = require('express');

const { generateRoster, getRosterByDate } = require('../controllers/rosterController');

const router = express.Router();

router.post('/rosters/generate', generateRoster);
router.post('/rosters', getRosterByDate);

module.exports = router;