const express = require('express');

const { generateRoster, getRosterByDate, publishRoster } = require('../controllers/rosterController');

const router = express.Router();

router.post('/rosters/generate', generateRoster);
router.get('/rosters', getRosterByDate);
router.post('/rosters/publish', publishRoster);

module.exports = router;