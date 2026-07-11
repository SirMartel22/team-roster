const express = require('express');
const { getSubunits, createSubunit } = require('../controllers/subunitController');

const router = express.Router();


// Defined the route to getting and creating subunit
router.get('/subunits', getSubunits);
router.post('/subunits', createSubunit);

module.exports = router;

