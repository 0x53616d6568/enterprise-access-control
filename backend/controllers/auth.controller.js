const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { success, error } = require('../utils/response');

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

    if (!rows.length)
      return error(res, 'Session not found or expired', 401);

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

module.exports = { login, refresh, logout, getMe, changePassword };
