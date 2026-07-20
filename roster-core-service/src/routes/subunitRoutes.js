const express = require('express');
const { getSubunits, createSubunit } = require('../controllers/subunitController');
const requireAuth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');

const router = express.Router();


// Defined the route to getting and creating subunit
router.get('/subunits', getSubunits);
router.post('/subunits', requireAuth, requireRole('admin'), createSubunit);

module.exports = router;

