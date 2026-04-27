const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getStatus, unlock } = require('../controllers/virtualDoor.controller');

// All routes require authentication
router.get('/status', authenticate, getStatus);
router.post('/unlock', authenticate, unlock);

module.exports = router;
