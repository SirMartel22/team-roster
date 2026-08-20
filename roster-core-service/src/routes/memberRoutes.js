const express = require('express');
const { getMembers, createMember, getMemberById, updateMember, deleteMember, getPerformance } = require("../controllers/memberController");
const requireAuth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');


const router = express.Router();

router.get('/members', requireAuth, getMembers);
router.post('/members', requireAuth, createMember);
router.get('/members/:id', requireAuth, getMemberById);
router.put('/members/:id', requireAuth, updateMember);
router.delete('/members/:id', requireAuth, requireRole('admin'), deleteMember);
router.get('/members/:id/performance', requireAuth, getPerformance);

module.exports = router;
