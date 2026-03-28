const crypto = require('crypto');
const db = require('../config/db');
const { hashToken, encrypt, decrypt } = require('./encryption');

const BLE_TOKEN_LENGTH = 32; // 256 bits
const BLE_TOKEN_VALIDITY_DAYS = 365;
const MAX_TOKENS_PER_USER = 5; // Prevent token explosion
const TOKEN_ROTATION_DAYS = 90; // Proactive rotation

/**
 * Generate a new secure BLE token
 * Format: BLE_<timestamp>_<randomBytes>_<checksum>
 * @returns {object} { token, displayToken }
 */
const generateBleToken = () => {
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(BLE_TOKEN_LENGTH).toString('hex');
  const plainToken = `${randomBytes}`;
  
  // Generate a checksum for validation
  const checksum = crypto
    .createHash('sha256')
    .update(plainToken + timestamp)
    .digest('hex')
    .substring(0, 8);
  
  const token = `BLE_${timestamp}_${plainToken}_${checksum}`;
  
  // Display format: First 8 chars hidden + last 8 visible
  const displayToken = `BLE_****${randomBytes.substring(randomBytes.length - 8)}`;
  
  return { token, displayToken };
};

/**
 * Create a new BLE token for a user
 * @param {number} userId - User ID
 * @param {string} deviceName - Name of device (optional)
 * @returns {object} Created token record
 */
const createBleToken = async (userId, deviceName = null) => {
  try {
    // Check token limit
    const [tokens] = await db.query(
      `SELECT COUNT(*) as count FROM ble_tokens 
       WHERE user_id = ? AND is_revoked = 0 AND expires_at > NOW()`,
      [userId]
    );

    if (tokens[0].count >= MAX_TOKENS_PER_USER) {
      throw new Error(`Maximum of ${MAX_TOKENS_PER_USER} active tokens allowed`);
    }

    const { token, displayToken } = generateBleToken();
    const tokenHash = hashToken(token);
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + BLE_TOKEN_VALIDITY_DAYS);

    const encryptedData = encrypt(token);

    const [result] = await db.query(
      `INSERT INTO ble_tokens 
       (user_id, token_hash, encrypted_token, iv, auth_tag, device_name, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`, 
      [
        userId,
        tokenHash,
        encryptedData.encrypted,
        encryptedData.iv,
        encryptedData.authTag,
        deviceName || 'Default Device',
        expiryDate,
      ]
    );

    // Log token creation
    await logBleActivity(userId, 'TOKEN_CREATED', `Created new BLE token for ${deviceName || 'unnamed device'}`);

    return {
      id: result.insertId,
      displayToken,
      expiresAt: expiryDate,
      deviceName: deviceName || 'Default Device',
      createdAt: new Date(),
    };
  } catch (err) {
    throw new Error('Failed to create BLE token: ' + err.message);
  }
};

/**
 * Validate and retrieve a BLE token
 * @param {string} token - The token to validate
 * @returns {object|null} Token data if valid, null otherwise
 */
const validateBleToken = async (token) => {
  try {
    const tokenHash = hashToken(token);

    const [rows] = await db.query(
      `SELECT * FROM ble_tokens 
       WHERE token_hash = ? AND is_revoked = 0 AND expires_at > NOW()`,
      [tokenHash]
    );

    if (!rows.length) {
      return null; // Invalid or expired token
    }

    const tokenRecord = rows[0];

    // Verify decryption works
    try {
      decrypt(tokenRecord.encrypted_token, tokenRecord.iv, tokenRecord.auth_tag);
    } catch {
      await revokeBleToken(tokenRecord.user_id, tokenRecord.id, 'DECRYPTION_FAILED');
      return null;
    }

    // Update last used timestamp
    await db.query(
      `UPDATE ble_tokens SET last_used_at = NOW() WHERE id = ?`,
      [tokenRecord.id]
    );

    return {
      id: tokenRecord.id,
      userId: tokenRecord.user_id,
      deviceName: tokenRecord.device_name,
      expiresAt: tokenRecord.expires_at,
      lastUsedAt: tokenRecord.last_used_at,
    };
  } catch (err) {
    console.error('Token validation error:', err);
    return null;
  }
};

/**
 * Rotate a BLE token (invalidate old, create new)
 * @param {number} userId - User ID
 * @param {number} tokenId - Token ID to rotate
 * @returns {object} New token
 */
const rotateBleToken = async (userId, tokenId) => {
  try {
    // Verify token ownership
    const [tokens] = await db.query(
      `SELECT * FROM ble_tokens WHERE id = ? AND user_id = ?`,
      [tokenId, userId]
    );

    if (!tokens.length) {
      throw new Error('Token not found');
    }

    const oldToken = tokens[0];

    // Revoke old token
    await db.query(
      `UPDATE ble_tokens SET is_revoked = 1, revoked_reason = 'ROTATED', revoked_at = NOW() WHERE id = ?`,
      [tokenId]
    );

    // Create new token
    const newToken = await createBleToken(userId, oldToken.device_name);

    await logBleActivity(userId, 'TOKEN_ROTATED', `Rotated token for ${oldToken.device_name}`);

    return newToken;
  } catch (err) {
    throw new Error('Failed to rotate BLE token: ' + err.message);
  }
};

/**
 * Revoke a BLE token
 * @param {number} userId - User ID
 * @param {number} tokenId - Token ID
 * @param {string} reason - Reason for revocation
 */
const revokeBleToken = async (userId, tokenId, reason = 'USER_REQUESTED') => {
  try {
    await db.query(
      `UPDATE ble_tokens 
       SET is_revoked = 1, revoked_reason = ?, revoked_at = NOW()
       WHERE id = ? AND user_id = ?`,
      [reason, tokenId, userId]
    );

    await logBleActivity(userId, 'TOKEN_REVOKED', `Revoked token: ${reason}`);
  } catch (err) {
    throw new Error('Failed to revoke BLE token: ' + err.message);
  }
};

/**
 * Get all active tokens for a user
 * @param {number} userId - User ID
 * @returns {array} Array of token records
 */
const getUserBleTokens = async (userId) => {
  try {
    const [tokens] = await db.query(
      `SELECT id, device_name, expires_at, created_at, last_used_at
       FROM ble_tokens
       WHERE user_id = ? AND is_revoked = 0 AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [userId]
    );

    return tokens;
  } catch (err) {
    throw new Error('Failed to fetch BLE tokens: ' + err.message);
  }
};

/**
 * Revoke all tokens for a user (emergency)
 * @param {number} userId - User ID
 */
const revokeAllUserTokens = async (userId) => {
  try {
    const [result] = await db.query(
      `UPDATE ble_tokens 
       SET is_revoked = 1, revoked_reason = 'ALL_REVOKED', revoked_at = NOW()
       WHERE user_id = ? AND is_revoked = 0`,
      [userId]
    );

    await logBleActivity(userId, 'ALL_TOKENS_REVOKED', 'All BLE tokens revoked');

    return result.affectedRows;
  } catch (err) {
    throw new Error('Failed to revoke all BLE tokens: ' + err.message);
  }
};

/**
 * Check for tokens that need proactive rotation
 * @param {number} userId - User ID
 * @returns {array} Tokens older than rotation threshold
 */
const checkTokensForRotation = async (userId) => {
  try {
    const rotationThreshold = new Date();
    rotationThreshold.setDate(rotationThreshold.getDate() - TOKEN_ROTATION_DAYS);

    const [tokens] = await db.query(
      `SELECT id, device_name, created_at FROM ble_tokens
       WHERE user_id = ? AND is_revoked = 0 AND created_at < ? AND expires_at > NOW()`,
      [userId, rotationThreshold]
    );

    return tokens;
  } catch (err) {
    console.error('Error checking token rotation:', err);
    return [];
  }
};

/**
 * Log BLE token activity for audit trail
 * @param {number} userId - User ID
 * @param {string} action - Action type (TOKEN_CREATED, TOKEN_ROTATED, etc.)
 * @param {string} details - Action details
 */
const logBleActivity = async (userId, action, details) => {
  try {
    await db.query(
      `INSERT INTO ble_token_audit_log (user_id, action, details, logged_at, ip_address)
       VALUES (?, ?, ?, NOW(), ?)`,
      [userId, action, details, '0.0.0.0'] // IP address would come from request context
    );
  } catch (err) {
    console.error('Failed to log BLE activity:', err);
  }
};

module.exports = {
  generateBleToken,
  createBleToken,
  validateBleToken,
  rotateBleToken,
  revokeBleToken,
  getUserBleTokens,
  revokeAllUserTokens,
  checkTokensForRotation,
  logBleActivity,
};