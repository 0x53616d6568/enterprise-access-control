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
  assignTeamToManager,
  removeTeamMember,
  getManagerTeam,
  getLocalEmailLog,
  getEmailPreviewById,
  getEmailsForRecipient,
  clearLocalEmails,
  exportEmailsAsHtml
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

/**
 * Manager Team Management Routes (Admin Only)
 */

// Assign team members to a manager
router.post('/manager-teams/assign', authenticate, assignTeamToManager);

// Get team members for a manager
router.get('/manager-teams/:manager_id', authenticate, getManagerTeam);

// Remove team member from manager
router.delete('/manager-teams/:manager_id/:member_id', authenticate, removeTeamMember);

/**
 * Local Email Service Routes (Admin Only)
 * View and manage locally stored emails
 */

// Get all local emails
router.get('/emails', authenticate, getLocalEmailLog);

// Get specific email by ID
router.get('/emails/:emailId', authenticate, getEmailPreviewById);

// Get all emails for a recipient
router.get('/emails/recipient/:email', authenticate, getEmailsForRecipient);

// Export emails as HTML report
router.get('/emails-report/html', authenticate, exportEmailsAsHtml);

// Clear all local emails
router.delete('/emails', authenticate, clearLocalEmails);

module.exports = router;
