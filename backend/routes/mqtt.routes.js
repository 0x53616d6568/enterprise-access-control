/**
 * MQTT Routes
 * API endpoints for MQTT token management and access requests
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  generateMqttToken,
  getUserTokens,
  revokeToken,
  revokeAllTokens,
  requestDoorAccess,
  submitFaceAuth,
  submitFaceAuthToken,
  getRequestStatus,
  getAccessHistory,
  verifyAccessRequest
} = require('../controllers/mqtt.controller');

// ============================================
// Token Management Routes
// ============================================

// Generate new MQTT token
router.post('/token/generate', authenticate, generateMqttToken);

// Get all tokens for current user
router.get('/tokens', authenticate, getUserTokens);

// Revoke specific token
router.post('/token/:tokenId/revoke', authenticate, revokeToken);

// Revoke all tokens
router.post('/tokens/revoke-all', authenticate, revokeAllTokens);

// ============================================
// Door Access Request Routes (Prompted Behavior)
// ============================================

// Create new access request (user presses button)
router.post('/request-access', authenticate, requestDoorAccess);

// Submit face authentication for access request (JWT authenticated - for app)
router.post('/request/:requestId/face-auth', authenticate, submitFaceAuth);

// Submit face authentication using MQTT token (for PC door station - no JWT required)
router.post('/request/:requestId/face-auth/token', submitFaceAuthToken);

// Get access request status
router.get('/request/:requestId/status', authenticate, getRequestStatus);

// Get user's access request history
router.get('/request-history', authenticate, getAccessHistory);

// ============================================
// Backend/Pi Verification Route
// ============================================

// Verify access request (called by Pi or door system)
router.post('/verify', verifyAccessRequest);

module.exports = router;
