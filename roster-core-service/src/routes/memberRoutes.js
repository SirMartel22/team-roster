const express = require('express');
const { getMembers, createMember, getMemberById, updateMember } = require("../controllers/memberController");
const requireAuth = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/members', requireAuth, getMembers);
router.post('/members', createMember);
router.get('/members/:id', getMemberById);
router.put('members/:id', updateMember);

module.exports = router;
