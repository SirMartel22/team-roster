const express = require('express');
const { getMembers, createMember, getMemberById, updateMember } = require("../controllers/memberController");

const router = express.Router();

router.get('/members', getMembers);
router.post('/members', createMember);
router.get('/members/:id', getMemberById);
router.put('members/:id', updateMember);

module.exports = router;
