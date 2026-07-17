const express = require('express');

const { generateRoster, getRosterByDate } = require('../controllers/rosterController');

const router = express.Router();

router.post('/rosters/generate', generateRoster);
router.get('/rosters', getRosterByDate);

module.exports = router;