const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { success, error } = require('../utils/response');
const {
  createBleToken,
  getUserBleTokens,
  rotateBleToken: rotateBleTokenService,
  revokeBleToken,
  revokeAllUserTokens,
  checkTokensForRotation,
} = require('../utils/bleTokenService');
const {
  sendPasswordResetEmail,
  verifyPasswordResetToken,
  resetPasswordWithToken,
} = require('../utils/gmailService');

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return error(res, 'Email and password are required', 400);

    const [rows] = await db.query(
      `SELECT u.user_id, u.full_name, u.email, u.password_hash,
              u.department, u.avatar_url, u.status, u.is_first_login,
              r.role_id, r.role_name, r.access_level
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE u.email = ?`,
      [email]
    );

    const user = rows[0];
    if (!user)
      return error(res, 'Invalid credentials', 401);

    // Block inactive accounts
    if (user.status === 'INACTIVE')
      return error(res, 'Account has been deactivated', 403);

    // Block pending accounts (admin hasn't activated yet)
    if (user.status === 'PENDING')
      return error(res, 'Account is pending activation', 403);

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch)
      return error(res, 'Invalid credentials', 401);

    const payload = {
      user_id:      user.user_id,
      role_id:      user.role_id,
      access_level: user.access_level,
    };

    const accessToken  = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    const deviceId     = req.headers['x-device-id'] || uuidv4();

    await db.query(
      `INSERT INTO user_sessions (user_id, device_id, auth_token, is_active)
       VALUES (?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE auth_token = ?, is_active = 1, last_activity = NOW()`,
      [user.user_id, deviceId, refreshToken, refreshToken]
    );

    await db.query(
      `UPDATE users SET last_login = NOW() WHERE user_id = ?`,
      [user.user_id]
    );

    return success(res, {
      accessToken,
      refreshToken,
      is_first_login: user.is_first_login === 1,
      user: {
        user_id:      user.user_id,
        full_name:    user.full_name,
        email:        user.email,
        department:   user.department,
        avatar_url:   user.avatar_url,
        role_name:    user.role_name,
        access_level: user.access_level,
      },
    }, 'Login successful');

  } catch (err) {
    next(err);
  }
};

// POST /api/auth/refresh
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return error(res, 'Refresh token required', 400);

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      return error(res, 'Invalid or expired refresh token', 401);
    }

    const [rows] = await db.query(
      `SELECT session_id FROM user_sessions
       WHERE user_id = ? AND auth_token = ? AND is_active = 1`,
      [decoded.user_id, refreshToken]
    );

    // If session not found (backend came back from cold start), recreate it
    if (!rows.length) {
      const deviceId = uuidv4();
      await db.query(
        `INSERT INTO user_sessions (user_id, device_id, auth_token, is_active)
         VALUES (?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE auth_token = ?, is_active = 1, last_activity = NOW()`,
        [decoded.user_id, deviceId, refreshToken, refreshToken]
      );
      console.log(`Session recreated for user ${decoded.user_id} after cold start`);
    }

    const newAccessToken = signAccessToken({
      user_id:      decoded.user_id,
      role_id:      decoded.role_id,
      access_level: decoded.access_level,
    });

    return success(res, { accessToken: newAccessToken }, 'Token refreshed');

  } catch (err) {
    next(err);
  }
};

// POST /api/auth/logout
const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    await db.query(
      `UPDATE user_sessions SET is_active = 0
       WHERE user_id = ? AND auth_token = ?`,
      [req.user.user_id, refreshToken]
    );
    return success(res, {}, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT u.user_id, u.full_name, u.email, u.phone,
              u.department, u.avatar_url, u.last_login, u.is_first_login,
              r.role_name, r.access_level
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE u.user_id = ?`,
      [req.user.user_id]
    );
    if (!rows.length) return error(res, 'User not found', 404);
    return success(res, rows[0]);
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/change-password
const changePassword = async (req, res, next) => {
  try {
    const { temp_password, new_password } = req.body;

    if (!temp_password || !new_password)
      return error(res, 'Both passwords are required', 400);

    if (new_password.length < 8)
      return error(res, 'Password must be at least 8 characters', 400);

    // Fetch current hash
    const [rows] = await db.query(
      `SELECT password_hash FROM users WHERE user_id = ?`,
      [req.user.user_id]
    );

    if (!rows.length) return error(res, 'User not found', 404);

    const match = await bcrypt.compare(temp_password, rows[0].password_hash);
    if (!match)
      return error(res, 'Temporary password is incorrect', 401);

    const newHash = await bcrypt.hash(new_password, 10);

    await db.query(
      `UPDATE users SET password_hash = ?, is_first_login = 0, status = 'ACTIVE'
       WHERE user_id = ?`,
      [newHash, req.user.user_id]
    );

    return success(res, {}, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/ble-token
// Retrieve or create BLE token for user
const getBleToken = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const deviceName = req.query.deviceName || 'Default Device';

    // Get existing active tokens
    const tokens = await getUserBleTokens(userId);

    // If user has an active token, return the first one
    // Otherwise create a new one
    if (tokens.length > 0) {
      const token = tokens[0];
      return success(res, {
        token_id: token.id,
        device_name: token.device_name,
        created_at: token.created_at,
        expires_at: token.expires_at,
        last_used_at: token.last_used_at,
        message: 'Use this token to authenticate with BLE devices',
      }, 'BLE token retrieved');
    }

    // Create new token
    const newToken = await createBleToken(userId, deviceName);

    return success(res, {
      token_id: newToken.id,
      display_token: newToken.displayToken,
      device_name: newToken.deviceName,
      created_at: newToken.createdAt,
      expires_at: newToken.expiresAt,
      message: 'New BLE token created. Copy it now - you won\'t see it again.',
    }, 'BLE token created successfully');
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/ble-tokens
// List all active BLE tokens for the user
const listBleTokens = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const rawTokens = await getUserBleTokens(userId);

    // Keep snake_case to match frontend expectations
    const tokens = rawTokens.map(token => ({
      token_id: token.id,
      device_name: token.device_name,
      created_at: token.created_at,
      expires_at: token.expires_at,
      last_used_at: token.last_used_at,
    }));

    return success(res, {
      tokens,
      count: tokens.length,
    }, 'Tokens retrieved successfully');
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/ble-token/rotate
// Rotate (invalidate and replace) a specific BLE token
const rotateBleToken = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const { tokenId } = req.body;

    if (!tokenId) {
      return error(res, 'Token ID is required', 400);
    }

    const rotatedToken = await rotateBleTokenService(userId, tokenId);

    return success(res, {
      token_id: rotatedToken.id,
      display_token: rotatedToken.displayToken,
      device_name: rotatedToken.deviceName,
      created_at: rotatedToken.createdAt,
      expires_at: rotatedToken.expiresAt,
      message: 'Token rotated successfully. Copy new token now - you won\'t see it again.',
    }, 'BLE token rotated successfully');
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/ble-token/revoke
// Manually revoke a BLE token
const revokeBleTokenEndpoint = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const { tokenId, reason = 'USER_REQUESTED' } = req.body;

    if (!tokenId) {
      return error(res, 'Token ID is required', 400);
    }

    await revokeBleToken(userId, tokenId, reason);

    return success(res, {}, 'Token revoked successfully');
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/ble-tokens/revoke-all
// Emergency: revoke all BLE tokens for the user
const revokeAllBleTokens = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const revokedCount = await revokeAllUserTokens(userId);

    return success(res, {
      count: revokedCount,
      message: 'All BLE tokens have been revoked. You will need to generate new tokens to access BLE devices.',
    }, 'All tokens revoked successfully');
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/ble-token/rotation-check
// Check which tokens need rotation (90+ days old)
const checkBleTokenRotation = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const tokensNeedingRotation = await checkTokensForRotation(userId);

    return success(res, {
      tokensNeedingRotation,
      count: tokensNeedingRotation.length,
      message: tokensNeedingRotation.length > 0 
        ? 'You have tokens that should be rotated for security.'
        : 'All your tokens are healthy.',
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/password-reset-request
// Request a password reset email (no auth required)
const requestPasswordReset = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return error(res, 'Email is required', 400);
    }

    // Find user by email
    const [rows] = await db.query(
      `SELECT user_id, full_name, email FROM users WHERE email = ? AND status != 'INACTIVE'`,
      [email]
    );

    if (!rows.length) {
      // Don't reveal if email exists (security)
      return success(res, {}, 'If the email exists, a reset code has been sent');
    }

    const user = rows[0];

    // Send password reset email
    try {
      await sendPasswordResetEmail(user.user_id, user.email, user.full_name);
    } catch (emailErr) {
      // Log detailed email error but still return success to client (security/UX)
      console.error('⚠️ Password reset email delivery failed:', {
        email: user.email,
        message: emailErr.message,
        code: emailErr.code,
        syscall: emailErr.syscall,
        address: emailErr.address
      });
      // Don't fail the request - token was created even if email failed
    }

    return success(res, {}, 'If the email exists, a reset code has been sent');
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/password-reset-verify
// Verify the reset token is still valid
const verifyPasswordResetTokenEndpoint = async (req, res, next) => {
  try {
    const { email, token } = req.body;

    if (!email || !token) {
      return error(res, 'Email and token are required', 400);
    }

    // Find user
    const [userRows] = await db.query(
      `SELECT user_id FROM users WHERE email = ?`,
      [email]
    );

    if (!userRows.length) {
      return error(res, 'User not found', 404);
    }

    const userId = userRows[0].user_id;

    // Verify token
    const isValid = await verifyPasswordResetToken(userId, token);

    if (!isValid) {
      return error(res, 'Invalid or expired reset token', 401);
    }

    return success(res, {}, 'Token is valid');
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/password-reset
// Complete password reset with token
const passwordReset = async (req, res, next) => {
  try {
    const { email, token, new_password } = req.body;

    if (!email || !token || !new_password) {
      return error(res, 'Email, token, and new password are required', 400);
    }

    if (new_password.length < 8) {
      return error(res, 'Password must be at least 8 characters', 400);
    }

    // Find user
    const [userRows] = await db.query(
      `SELECT user_id FROM users WHERE email = ?`,
      [email]
    );

    if (!userRows.length) {
      return error(res, 'User not found', 404);
    }

    const userId = userRows[0].user_id;

    // Verify token is valid
    const isValid = await verifyPasswordResetToken(userId, token);
    if (!isValid) {
      return error(res, 'Invalid or expired reset token', 401);
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(new_password, 10);

    // Update password and mark token as used in transaction
    await resetPasswordWithToken(userId, token, new_password);

    await db.query(
      `UPDATE users SET password_hash = ?, is_first_login = 0, status = 'ACTIVE'
       WHERE user_id = ?`,
      [passwordHash, userId]
    );

    return success(res, {}, 'Password has been reset successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  login,
  refresh,
  logout,
  getMe,
  changePassword,
  getBleToken,
  listBleTokens,
  rotateBleToken,
  revokeBleTokenEndpoint,
  revokeAllBleTokens,
  checkBleTokenRotation,
  requestPasswordReset,
  verifyPasswordResetTokenEndpoint,
  passwordReset,
};
