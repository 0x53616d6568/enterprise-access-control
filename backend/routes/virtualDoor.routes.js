const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getStatus, unlock } = require('../controllers/virtualDoor.controller');

// Status endpoint is public (for monitoring/testing)
router.get('/status', getStatus);

// Unlock requires authentication (managers/admins only)
router.post('/unlock', authenticate, unlock);

module.exports = router;
