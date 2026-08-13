const express = require('express');
const { getSubunits, createSubunit, updateSubunit, deleteSubunit } = require('../controllers/subunitController');
const requireAuth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');

const router = express.Router();


// Defined the route to getting and creating subunit
router.get('/subunits', getSubunits);
router.post('/subunits', requireAuth, requireRole('admin'), createSubunit);
router.put('/subunits/:id', requireAuth, requireRole('admin'), updateSubunit);
router.delete('/subunits/:id', requireAuth, requireRole('admin'), deleteSubunit);

module.exports = router;

