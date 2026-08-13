const express = require('express');
const { notifyRosterPublished, notifyInvitation, notifySwitchRequest } = require('../controllers/notificationController');
const requireServiceAuth = require('../middleware/requireServiceAuth');


const router = express.Router();

router.post('/notify/roster-published', requireServiceAuth, notifyRosterPublished);
router.post('/notify/invitation', requireServiceAuth, notifyInvitation);
router.post('/notify/switch-request', requireServiceAuth, notifySwitchRequest);

module.exports = router;
