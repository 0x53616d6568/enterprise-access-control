/**
 * MQTT Token Service
 * Handles token generation, validation, encryption, and audit logging
 * Replaces automatic BLE with prompted MQTT-based door access
 */

const crypto = require('crypto');
const db = require('../config/db');

// Configuration
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const TOKEN_LENGTH = 32;
const TOKEN_EXPIRY_DAYS = 90;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-256-bit-encryption-key-here';

/**
 * Generate a new MQTT token for a user
 * @param {number} userId - User ID
 * @param {string} deviceName - Optional device name
 * @returns {Object} { token, displayToken, tokenId, expiresAt }
 */
const createMqttToken = async (userId, deviceName = 'MQTT Device') => {
  try {
    // Generate random token
    const token = crypto.randomBytes(TOKEN_LENGTH).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Encrypt token
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'utf-8').slice(0, 32), iv);
    let encryptedToken = cipher.update(token, 'utf8', 'hex');
    encryptedToken += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    // Calculate expiry
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    // Store in database
    const [result] = await db.query(
      `INSERT INTO mqtt_tokens 
       (user_id, token_hash, encrypted_token, iv, auth_tag, device_name, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, tokenHash, encryptedToken, iv.toString('hex'), authTag, deviceName, expiresAt]
    );

    // Log activity
    await logMqttActivity(userId, result.insertId, 'TOKEN_CREATED', `Token created for device: ${deviceName}`);

    return {
      token,
      tokenHash,
      displayToken: `${token.slice(0, 8)}...${token.slice(-4)}`, // For display only
      tokenId: result.insertId,
      expiresAt,
      deviceName
    };
  } catch (err) {
    console.error('Error creating MQTT token:', err);
    throw err;
  }
};

/**
 * Verify and decrypt an MQTT token
 * @param {string} tokenHash - SHA256 hash of token
 * @returns {Object} { userId, valid, reason }
 */
const verifyMqttToken = async (tokenHash) => {
  try {
    const [tokens] = await db.query(
      `SELECT mt.id, mt.user_id, mt.expires_at, mt.is_revoked
       FROM mqtt_tokens mt
       WHERE mt.token_hash = ?`,
      [tokenHash]
    );

    if (!tokens.length) {
      return { valid: false, reason: 'TOKEN_NOT_FOUND' };
    }

    const token = tokens[0];

    // Check if revoked
    if (token.is_revoked) {
      return { valid: false, reason: 'TOKEN_REVOKED' };
    }

    // Check if expired
    if (new Date(token.expires_at) < Date.now()) {
      return { valid: false, reason: 'TOKEN_EXPIRED' };
    }

    // Update last used timestamp
    await db.query(
      `UPDATE mqtt_tokens SET last_used_at = NOW() WHERE id = ?`,
      [token.id]
    );

    return { valid: true, userId: token.user_id, tokenId: token.id };
  } catch (err) {
    console.error('Error verifying MQTT token:', err);
    return { valid: false, reason: 'VERIFICATION_ERROR' };
  }
};

/**
 * Get user's MQTT tokens
 * @param {number} userId - User ID
 * @returns {Array} Array of user's tokens
 */
const getUserMqttTokens = async (userId) => {
  try {
    const [tokens] = await db.query(
      `SELECT 
        id, token_hash, device_name, created_at, expires_at, last_used_at, is_revoked,
        CASE 
          WHEN is_revoked = 1 THEN 'revoked'
          WHEN expires_at < NOW() THEN 'expired'
          ELSE 'active'
        END as status
       FROM mqtt_tokens
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );

    return tokens;
  } catch (err) {
    console.error('Error getting user tokens:', err);
    throw err;
  }
};

/**
 * Revoke a specific MQTT token
 * @param {number} tokenId - Token ID to revoke
 * @param {string} reason - Reason for revocation
 */
const revokeMqttToken = async (tokenId, reason = 'USER_REQUESTED') => {
  try {
    const [tokenRows] = await db.query(
      `SELECT user_id FROM mqtt_tokens WHERE id = ?`,
      [tokenId]
    );

    if (!tokenRows.length) {
      throw new Error('Token not found');
    }

    await db.query(
      `UPDATE mqtt_tokens 
       SET is_revoked = 1, revoked_at = NOW(), revoked_reason = ?
       WHERE id = ?`,
      [reason, tokenId]
    );

    // Log activity
    await logMqttActivity(tokenRows[0].user_id, tokenId, 'TOKEN_REVOKED', `Reason: ${reason}`);

    return true;
  } catch (err) {
    console.error('Error revoking token:', err);
    throw err;
  }
};

/**
 * Revoke all user tokens
 * @param {number} userId - User ID
 */
const revokeMqttAllUserTokens = async (userId) => {
  try {
    await db.query(
      `UPDATE mqtt_tokens 
       SET is_revoked = 1, revoked_at = NOW(), revoked_reason = 'ALL_REVOKED'
       WHERE user_id = ? AND is_revoked = 0`,
      [userId]
    );

    // Log activity
    await logMqttActivity(userId, null, 'ALL_TOKENS_REVOKED', 'All user tokens revoked');

    return true;
  } catch (err) {
    console.error('Error revoking all tokens:', err);
    throw err;
  }
};

/**
 * Log MQTT activity for audit trail
 * @param {number} userId - User ID
 * @param {number} tokenId - Token ID (optional)
 * @param {string} action - Action type
 * @param {string} details - Action details
 * @param {number} accessRequestId - Access request ID (optional)
 */
const logMqttActivity = async (userId, tokenId, action, details, accessRequestId = null) => {
  try {
    await db.query(
      `INSERT INTO mqtt_token_audit_log 
       (user_id, token_id, action, details, access_request_id, timestamp)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [userId, tokenId, action, details, accessRequestId]
    );
  } catch (err) {
    console.error('Error logging MQTT activity:', err);
    // Don't throw - logging failure shouldn't break the flow
  }
};

/**
 * Create an MQTT access request (Prompted behavior)
 * @param {number} userId - User ID
 * @param {number} doorId - Door ID
 * @param {number} tokenId - MQTT Token ID
 * @returns {Object} Access request details
 */
const createAccessRequest = async (userId, doorId, tokenId) => {
  try {
    const [result] = await db.query(
      `INSERT INTO mqtt_access_requests 
       (user_id, door_id, token_id, status, request_timestamp)
       VALUES (?, ?, ?, 'PENDING', NOW())`,
      [userId, doorId, tokenId]
    );

    // Log activity
    await logMqttActivity(userId, tokenId, 'ACCESS_REQUESTED', `Door ID: ${doorId}`, result.insertId);

    return { requestId: result.insertId, status: 'PENDING' };
  } catch (err) {
    console.error('Error creating access request:', err);
    throw err;
  }
};

/**
 * Update access request status
 * @param {number} requestId - Access request ID
 * @param {string} status - New status
 * @param {Object} updates - Additional updates
 */
const updateAccessRequest = async (requestId, status, updates = {}) => {
  try {
    const updateFields = ['status = ?'];
    const values = [status];

    // Add optional fields
    if (updates.face_auth_required !== undefined) {
      updateFields.push('requires_face_auth = ?');
      values.push(updates.face_auth_required ? 1 : 0);
    }

    if (updates.face_auth_passed !== undefined) {
      updateFields.push('face_auth_passed = ?');
      values.push(updates.face_auth_passed ? 1 : 0);
    }

    if (updates.face_auth_timestamp) {
      updateFields.push('face_auth_timestamp = ?');
      values.push(updates.face_auth_timestamp);
    }

    if (updates.access_result) {
      updateFields.push('access_result = ?');
      values.push(updates.access_result);
    }

    if (updates.denial_reason) {
      updateFields.push('denial_reason = ?');
      values.push(updates.denial_reason);
    }

    values.push(requestId);

    // Always update response_timestamp when status changes
    updateFields.push('response_timestamp = NOW()');

    const query = `UPDATE mqtt_access_requests SET ${updateFields.join(', ')} WHERE id = ?`;
    await db.query(query, values);

    return true;
  } catch (err) {
    console.error('Error updating access request:', err);
    throw err;
  }
};

/**
 * Get access request history for a user
 * @param {number} userId - User ID
 * @param {number} limit - Limit results
 * @returns {Array} Access request history
 */
const getUserAccessRequestHistory = async (userId, limit = 50) => {
  try {
    const [requests] = await db.query(
      `SELECT 
        mar.id,
        mar.door_id,
        d.door_name,
        d.location,
        mar.status,
        mar.requires_face_auth,
        mar.face_auth_passed,
        mar.request_timestamp,
        mar.access_result,
        TIMESTAMPDIFF(SECOND, mar.request_timestamp, mar.response_timestamp) as response_time_seconds
       FROM mqtt_access_requests mar
       JOIN doors d ON mar.door_id = d.door_id
       WHERE mar.user_id = ?
       ORDER BY mar.request_timestamp DESC
       LIMIT ?`,
      [userId, limit]
    );

    return requests;
  } catch (err) {
    console.error('Error getting access request history:', err);
    throw err;
  }
};

/**
 * Clean up expired access requests (older than 24 hours)
 */
const cleanupExpiredRequests = async () => {
  try {
    const [result] = await db.query(
      `UPDATE mqtt_access_requests 
       SET status = 'EXPIRED'
       WHERE status = 'PENDING' 
         AND request_timestamp < DATE_SUB(NOW(), INTERVAL 24 HOUR)`
    );

    console.log(`Cleaned up ${result.affectedRows} expired requests`);
    return result.affectedRows;
  } catch (err) {
    console.error('Error cleaning up expired requests:', err);
  }
};

module.exports = {
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
};
