const express = require('express');
const router = express.Router();
const {
  getUsersTokenStatus,
  generateTokenForUser,
  generateTokensBatch,
  getTokenAuditLog,
  getTokenAlerts,
  acknowledgeAlert,
  acknowledgeAlertsBulk,
} = require('../controllers/admin.controller');
const { authenticate } = require('../middleware/auth');

// All admin routes require authentication and admin role
// Admin role check is done inside each controller (access_level >= 5)

/**
 * BLE Token Management Routes (Admin Only)
 */

// View token status for all users
router.get('/ble-tokens/status', authenticate, getUsersTokenStatus);

// Generate token for specific user
router.post('/ble-tokens/generate/:userId', authenticate, generateTokenForUser);

// Batch generate tokens for multiple users
router.post('/ble-tokens/generate-batch', authenticate, generateTokensBatch);

// View audit log
router.get('/ble-tokens/audit-log', authenticate, getTokenAuditLog);

// View active alerts
router.get('/ble-tokens/alerts', authenticate, getTokenAlerts);

// Acknowledge single alert
router.post('/ble-tokens/alerts/:alertId/acknowledge', authenticate, acknowledgeAlert);

// Acknowledge multiple alerts
router.post('/ble-tokens/alerts/bulk-acknowledge', authenticate, acknowledgeAlertsBulk);

module.exports = router;
