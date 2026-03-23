const express = require('express');
const router  = express.Router();
const { piAuthenticate } = require('../middleware/piAuth');
const {
  verifyAccess, logAccessAttempt, syncDoorData
} = require('../controllers/pi.controller');

// All Pi routes protected by API key, not JWT
router.post('/verify',    piAuthenticate, verifyAccess);
router.post('/log',       piAuthenticate, logAccessAttempt);
router.get('/sync/:doorId', piAuthenticate, syncDoorData);

module.exports = router;
