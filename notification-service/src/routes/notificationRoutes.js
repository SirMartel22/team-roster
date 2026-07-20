const express = require('express');
const { notifyRosterPublished } = require('../controllers/notificationController');


const router = express.Router();

router.post('/notify/roster-published', notifyRosterPublished);

module.exports = router;