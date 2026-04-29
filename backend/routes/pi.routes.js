const express = require('express');
const router  = express.Router();
const { piAuthenticate } = require('../middleware/piAuth');
const {
  verifyAccess, logAccessAttempt, syncDoorData, handleDoorAccessRequest
} = require('../controllers/pi.controller');

// All Pi routes protected by API key, not JWT
router.post('/verify',             piAuthenticate, verifyAccess);
router.post('/log',                piAuthenticate, logAccessAttempt);
router.get('/sync/:doorId',        piAuthenticate, syncDoorData);

// New endpoint: ESP door access request with face verification
router.post('/door-access-request', piAuthenticate, handleDoorAccessRequest);

module.exports = router;
