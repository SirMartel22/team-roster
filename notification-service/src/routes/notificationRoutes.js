const express = require('express');
const { notifyRosterPublished, notifyInvitation, notifySwitchRequest, notifyPasswordReset, notifyTaskReminders } = require('../controllers/notificationController');
const requireServiceAuth = require('../middleware/requireServiceAuth');


const router = express.Router();

router.post('/notify/roster-published', requireServiceAuth, notifyRosterPublished);
router.post('/notify/invitation', requireServiceAuth, notifyInvitation);
router.post('/notify/switch-request', requireServiceAuth, notifySwitchRequest);
router.post('/notify/password-reset', requireServiceAuth, notifyPasswordReset);
router.post('/notify/task-reminders', requireServiceAuth, notifyTaskReminders);

module.exports = router;
