const express = require('express');
const { getDuties, createDuty, deleteDuty } = require('../controllers/dutyController');
const requireAuth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');



const router = express.Router();


router.get('/duties', requireAuth, getDuties);
router.post('/duties', requireAuth, requireRole('admin'), createDuty);
router.delete('/duties/:id', requireAuth, requireRole('admin'), deleteDuty);


module.exports = router;
