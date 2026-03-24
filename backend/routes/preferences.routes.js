const express = require('express');
const router = express.Router();
const { getUserPreferences, saveThemePreferences, saveNotificationPreferences } = require('../controllers/preferences.controller');
const { authenticate } = require('../middleware/auth');

// All preference endpoints require authentication
router.use(authenticate);

// GET all preferences
router.get('/', getUserPreferences);

// POST/PUT theme preferences
router.post('/theme', saveThemePreferences);

// POST/PUT notification preferences
router.post('/notifications', saveNotificationPreferences);

module.exports = router;
