/**
 * MQTT Controller
 * Handles MQTT token management and access request endpoints
 */

const db = require('../config/db');
const mqtt = require('mqtt');
const { success, error } = require('../utils/response');
const {
  createMqttToken,
  verifyMqttToken,
  getUserMqttTokens,
  revokeMqttToken,
  revokeMqttAllUserTokens,
  logMqttActivity,
  createAccessRequest,
  updateAccessRequest,
  getUserAccessRequestHistory,
  cleanupExpiredRequests
} = require('../utils/mqttTokenService');

// MQTT Client for publishing unlock commands
let mqttClient = null;
let mqttConnected = false;

/**
 * Initialize or get MQTT client for publishing to HiveMQ
 */
const getMqttClient = () => {
  if (mqttClient && mqttConnected) {
    return mqttClient;
  }

  const brokerUrl = process.env.MQTT_BROKER || 'mqtts://bb9f7b883ac247ceb390c4c532330999.s1.eu.hivemq.cloud:8883';
  const username = process.env.MQTT_USER || 'Sameh';
  const password = process.env.MQTT_PASSWORD || 'Samehsameh1020';

  mqttClient = mqtt.connect(brokerUrl, {
    username,
    password,
    clientId: `backend-mqtt-${Date.now()}`,
    clean: true,
    reconnectPeriod: 5000,
    rejectUnauthorized: false,
    connectTimeout: 10000,
    keepalive: 30
  });

  mqttClient.on('connect', () => {
    console.log('✅ [MQTT] Backend connected to HiveMQ broker');
    mqttConnected = true;
  });

  mqttClient.on('error', (err) => {
    console.error('❌ [MQTT] Connection error:', err.message);
    mqttConnected = false;
  });

  mqttClient.on('disconnect', () => {
    console.log('⚠️  [MQTT] Disconnected from broker');
    mqttConnected = false;
  });

  return mqttClient;
};

/**
 * Publish unlock command to MQTT
 * @param {number} doorId - Door ID
 * @param {number} userId - User ID
 * @param {number} requestId - Access request ID
 */
const publishUnlockCommand = (doorId, userId, requestId) => {
  return new Promise((resolve) => {
    try {
      const client = getMqttClient();
      const topic = `doors/${doorId}/unlock`;
      const payload = JSON.stringify({
        action: 'UNLOCK',
        doorId,
        userId,
        requestId,
        timestamp: new Date().toISOString(),
        duration: 5000  // Unlock for 5 seconds (LED blinking)
      });

      console.log(`\n[🔓 MQTT Unlock] Publishing to ${topic}`);
      console.log(`   Payload: ${payload}`);

      client.publish(topic, payload, { qos: 1 }, (err) => {
        if (err) {
          console.error(`❌ [MQTT] Publish failed: ${err.message}`);
          resolve(false);
        } else {
          console.log(`✅ [MQTT] Unlock command sent successfully`);
          resolve(true);
        }
      });
    } catch (err) {
      console.error(`❌ [MQTT] Publish error: ${err.message}`);
      resolve(false);
    }
  });
};

/**
 * POST /api/mqtt/token/generate
 * Generate a new MQTT token for the current user
 */
const generateMqttToken = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const { deviceName = 'MQTT Device' } = req.body;

    const tokenData = await createMqttToken(userId, deviceName);

    return success(res, tokenData, 'MQTT token created', 201);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/mqtt/tokens
 * Get all MQTT tokens for current user
 */
const getUserTokens = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const tokens = await getUserMqttTokens(userId);

    return success(res, { tokens }, 'Tokens retrieved');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/mqtt/token/:tokenId/revoke
 * Revoke a specific MQTT token
 */
const revokeToken = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const { tokenId } = req.params;
    const { reason = 'USER_REQUESTED' } = req.body;

    // Verify token belongs to user
    const [tokens] = await db.query(
      `SELECT user_id FROM mqtt_tokens WHERE id = ?`,
      [tokenId]
    );

    if (!tokens.length || tokens[0].user_id !== userId) {
      return error(res, 'Token not found', 404);
    }

    await revokeMqttToken(tokenId, reason);

    return success(res, {}, 'Token revoked');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/mqtt/tokens/revoke-all
 * Revoke all MQTT tokens for current user
 */
const revokeAllTokens = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    await revokeMqttAllUserTokens(userId);

    return success(res, {}, 'All tokens revoked');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/mqtt/request-access
 * Create an MQTT access request (Prompted behavior - user presses button)
 * 
 * Body: { doorId, tokenId }
 */
const requestDoorAccess = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const { doorId } = req.body;

    if (!doorId) {
      return error(res, 'doorId is required', 400);
    }

    // 1. Auto-generate or get existing MQTT token for user
    let tokenId;
    const [existingTokens] = await db.query(
      `SELECT id, expires_at, is_revoked FROM mqtt_tokens WHERE user_id = ? AND is_revoked = 0 AND expires_at > NOW() LIMIT 1`,
      [userId]
    );

    if (existingTokens.length) {
      // Use existing valid token
      tokenId = existingTokens[0].id;
    } else {
      // Create new token
      const tokenData = await createMqttToken(userId, 'auto-generated');
      tokenId = tokenData.id;
    }

    // 2. Verify user has access to door
    const [access] = await db.query(
      `SELECT uda.user_door_id, uda.allowed_from, uda.allowed_until, uda.days_of_week,
              d.requires_face_auth, d.door_id
       FROM user_door_access uda
       JOIN doors d ON uda.door_id = d.door_id
       WHERE uda.user_id = ? AND uda.door_id = ?`,
      [userId, doorId]
    );

    if (!access.length) {
      return error(res, 'No access to this door', 403);
    }

    const doorAccess = access[0];

    // Check time restrictions
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    const dayOfWeek = now.getDay();
    
    console.log(`[MQTT Access] Time check: current time=${currentTime}, allowed from=${doorAccess.allowed_from}, allowed until=${doorAccess.allowed_until}`);

    if (doorAccess.allowed_from && currentTime < doorAccess.allowed_from) {
      return error(res, 'Access not allowed at this time', 403);
    }

    if (doorAccess.allowed_until && currentTime > doorAccess.allowed_until) {
      return error(res, 'Access not allowed at this time', 403);
    }

    // Check day of week restrictions
    // If days_of_week is set, validate the current day
    if (doorAccess.days_of_week && doorAccess.days_of_week.trim()) {
      const allowedDays = doorAccess.days_of_week.split(',').map(d => parseInt(d.trim()));
      console.log(`[MQTT Access] Day check: current day=${dayOfWeek}, allowed days=${allowedDays}`);
      if (!allowedDays.includes(dayOfWeek)) {
        return error(res, 'No access on this day', 403);
      }
    }

    // 3. Create access request
    const requestData = await createAccessRequest(userId, doorId, tokenId);

    // 4. Check if face auth is required
    let requiresFaceAuth = false;
    if (doorAccess.requires_face_auth) {
      requiresFaceAuth = true;
      await updateAccessRequest(requestData.requestId, 'FACE_AUTH_REQUIRED', {
        face_auth_required: true
      });
    } else {
      // No face auth required - grant access
      await updateAccessRequest(requestData.requestId, 'ACCESS_GRANTED', {
        access_result: 'GRANTED'
      });

      // 5. Publish unlock command to MQTT (async, non-blocking)
      publishUnlockCommand(doorId, userId, requestData.requestId).catch(err => {
        console.error('[MQTT] Failed to publish unlock command:', err.message);
      });
    }

    return success(res, {
      requestId: requestData.requestId,
      status: requiresFaceAuth ? 'FACE_AUTH_REQUIRED' : 'ACCESS_GRANTED',
      requiresFaceAuth,
      doorId,
      doorName: (await db.query(`SELECT door_name FROM doors WHERE door_id = ?`, [doorId]))[0][0].door_name
    }, 'Access request created', 201);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/mqtt/request/:requestId/face-auth
 * Submit face authentication for an access request
 * 
 * Body: { faceEmbedding or faceAuthResult }
 */
const submitFaceAuth = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const { requestId } = req.params;
    const { faceAuthPassed, faceEmbedding } = req.body;

    // Verify request belongs to user
    const [requests] = await db.query(
      `SELECT id, door_id, status FROM mqtt_access_requests WHERE id = ? AND user_id = ?`,
      [requestId, userId]
    );

    if (!requests.length) {
      return error(res, 'Request not found', 404);
    }

    const request = requests[0];

    if (request.status !== 'FACE_AUTH_REQUIRED') {
      return error(res, 'Face auth not required for this request', 400);
    }

    // TODO: Integrate with face recognition service
    // For now, we'll accept the faceAuthPassed flag from the client
    
    if (faceAuthPassed) {
      await updateAccessRequest(requestId, 'FACE_AUTH_PASSED', {
        face_auth_passed: true,
        face_auth_timestamp: new Date(),
        access_result: 'GRANTED'
      });

      // Also update to ACCESS_GRANTED for consistency
      await updateAccessRequest(requestId, 'ACCESS_GRANTED', {
        access_result: 'GRANTED'
      });

      await logMqttActivity(userId, null, 'FACE_AUTH_PASSED', `Request ID: ${requestId}`);

      // Publish unlock command to MQTT after face auth passes (async, non-blocking)
      publishUnlockCommand(request.door_id, userId, requestId).catch(err => {
        console.error('[MQTT] Failed to publish unlock command after face auth:', err.message);
      });

      return success(res, {
        requestId,
        status: 'ACCESS_GRANTED',
        message: 'Face authentication passed. Access granted.'
      });
    } else {
      await updateAccessRequest(requestId, 'FACE_AUTH_FAILED', {
        face_auth_passed: false,
        face_auth_timestamp: new Date(),
        access_result: 'DENIED',
        denial_reason: 'Face authentication failed'
      });

      await logMqttActivity(userId, null, 'FACE_AUTH_FAILED', `Request ID: ${requestId}`);

      return error(res, 'Face authentication failed', 401);
    }
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/mqtt/request/:requestId/status
 * Get current status of an access request
 */
const getRequestStatus = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const { requestId } = req.params;

    const [requests] = await db.query(
      `SELECT 
        id, status, requires_face_auth, face_auth_passed, 
        request_timestamp, response_timestamp, access_result,
        TIMESTAMPDIFF(SECOND, request_timestamp, response_timestamp) as response_time_seconds
       FROM mqtt_access_requests
       WHERE id = ? AND user_id = ?`,
      [requestId, userId]
    );

    if (!requests.length) {
      return error(res, 'Request not found', 404);
    }

    return success(res, requests[0], 'Request status retrieved');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/mqtt/request-history
 * Get user's access request history
 */
const getAccessHistory = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const { limit = 50 } = req.query;

    const history = await getUserAccessRequestHistory(userId, parseInt(limit));

    return success(res, { history }, 'Access history retrieved');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/mqtt/verify (For Pi/Backend verification)
 * Verify if an access request should be granted
 * Called by Pi or door system to confirm access
 */
const verifyAccessRequest = async (req, res, next) => {
  try {
    const { requestId, tokenHash, doorId } = req.body;

    if (!requestId || !tokenHash || !doorId) {
      return error(res, 'requestId, tokenHash, and doorId are required', 400);
    }

    // 1. Verify token hash is valid
    const tokenVerification = await verifyMqttToken(tokenHash);

    if (!tokenVerification.valid) {
      return error(res, `Token verification failed: ${tokenVerification.reason}`, 401);
    }

    // 2. Get access request
    const [requests] = await db.query(
      `SELECT 
        id, user_id, door_id, status, face_auth_passed, requires_face_auth,
        request_timestamp
       FROM mqtt_access_requests
       WHERE id = ? AND user_id = ?`,
      [requestId, tokenVerification.userId]
    );

    if (!requests.length) {
      return error(res, 'Access request not found', 404);
    }

    const request = requests[0];

    // 3. Verify request is still valid (not expired - within 30 seconds)
    const age = Math.floor((Date.now() - new Date(request.request_timestamp)) / 1000);
    if (age > 30) {
      return error(res, 'Request expired', 401);
    }

    // 4. Check if face auth was required and passed
    if (request.requires_face_auth && !request.face_auth_passed) {
      return success(res, {
        granted: false,
        reason: 'FACE_AUTH_REQUIRED',
        requestId
      });
    }

    // 5. Verify door access
    const [access] = await db.query(
      `SELECT user_door_id FROM user_door_access WHERE user_id = ? AND door_id = ?`,
      [request.user_id, doorId]
    );

    if (!access.length) {
      return error(res, 'No door access found', 403);
    }

    // 6. Grant access
    await updateAccessRequest(requestId, 'ACCESS_GRANTED', {
      access_result: 'GRANTED'
    });

    await logMqttActivity(request.user_id, null, 'ACCESS_VERIFIED', `Door ID: ${doorId}`, requestId);

    return success(res, {
      granted: true,
      requestId,
      userId: request.user_id,
      doorId
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  generateMqttToken,
  getUserTokens,
  revokeToken,
  revokeAllTokens,
  requestDoorAccess,
  submitFaceAuth,
  getRequestStatus,
  getAccessHistory,
  verifyAccessRequest
};
