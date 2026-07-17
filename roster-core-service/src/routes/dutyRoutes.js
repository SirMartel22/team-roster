const express = require('express');
const { getDuties, createDuty, deleteDuty } = require('../controllers/dutyController');

const router = express.Router();


router.get('/duties', getDuties);
router.post('/duties', createDuty);
router.delete('/duties/:id', deleteDuty);


module.exports = router;