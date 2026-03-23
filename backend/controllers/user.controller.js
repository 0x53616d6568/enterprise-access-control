const bcrypt    = require('bcryptjs');
const nodemailer = require('nodemailer');
const db        = require('../config/db');
const { success, error } = require('../utils/response');
/*
// Email transporter For gmail, using environment variables for credentials
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});*/
//Email transportor for testing with Ethereal Email (https://ethereal.email/)
const transporter = nodemailer.createTransport({
  host: 'smtp.ethereal.email',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
  family: 4,
});
// Generate temp password
const generateTempPassword = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

// GET /api/users — Admin/Manager only
const getAllUsers = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT u.user_id, u.full_name, u.email, u.phone,
              u.department, u.avatar_url, u.status,
              u.is_first_login, u.last_login,
              r.role_id, r.role_name, r.access_level
       FROM users u JOIN roles r ON u.role_id = r.role_id
       ORDER BY u.full_name`
    );
    return success(res, rows);
  } catch (err) { next(err); }
};

// GET /api/users/:id
const getUserById = async (req, res, next) => {
  try {
    const id = req.params.id === 'me' ? req.user.user_id : req.params.id;
    const [rows] = await db.query(
      `SELECT u.user_id, u.full_name, u.email, u.phone,
              u.department, u.avatar_url, u.status, u.last_login,
              r.role_name, r.access_level
       FROM users u JOIN roles r ON u.role_id = r.role_id
       WHERE u.user_id = ?`,
      [id]
    );
    if (!rows.length) return error(res, 'User not found', 404);
    return success(res, rows[0]);
  } catch (err) { next(err); }
};

// POST /api/users — Admin only: create user + send welcome email
const createUser = async (req, res, next) => {
  try {
    const { full_name, email, phone, department, role_id } = req.body;

    if (!full_name || !email || !role_id)
      return error(res, 'Name, email and role are required', 400);

    // Check email not already taken
    const [existing] = await db.query(
      `SELECT user_id FROM users WHERE email = ?`, [email]
    );
    if (existing.length)
      return error(res, 'Email already in use', 409);

    // Generate + hash temp password
    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const [result] = await db.query(
      `INSERT INTO users
        (full_name, email, phone, department, role_id, password_hash, status, is_first_login)
       VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', 1)`,
      [full_name, email, phone, department, role_id, passwordHash]
    );

    // Send welcome email
    await transporter.sendMail({
      from:    `"Access Control" <${process.env.EMAIL_USER}>`,
      to:      email,
      subject: 'Welcome to the team — your account is ready',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
          <h2 style="color:#0D1117">Welcome, ${full_name}!</h2>
          <p>Your enterprise access account has been created. Here are your login credentials:</p>
          <div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0;">
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Temporary Password:</strong> <code>${tempPassword}</code></p>
          </div>
          <p style="color:#e53e3e"><strong>Important:</strong> You will be required to change your password on first login.</p>
          <p style="color:#666;font-size:13px">If you have any issues, contact your system administrator.</p>
        </div>
      `,
    });

    return success(res, { user_id: result.insertId }, 'User created and email sent', 201);
  } catch (err) { next(err); }
};

// PUT /api/users/:id
const updateUser = async (req, res, next) => {
  try {
    const id = req.params.id;
    if (req.user.user_id !== parseInt(id) && req.user.access_level < 5)
      return error(res, 'Insufficient permissions', 403);

    const { full_name, phone, department, avatar_url } = req.body;
    await db.query(
      `UPDATE users SET
        full_name  = COALESCE(?, full_name),
        phone      = COALESCE(?, phone),
        department = COALESCE(?, department),
        avatar_url = COALESCE(?, avatar_url)
       WHERE user_id = ?`,
      [full_name, phone, department, avatar_url, id]
    );
    return success(res, {}, 'User updated');
  } catch (err) { next(err); }
};

// DELETE /api/users/:id — soft delete (set INACTIVE)
const deleteUser = async (req, res, next) => {
  try {
    await db.query(
      `UPDATE users SET status = 'INACTIVE' WHERE user_id = ?`,
      [req.params.id]
    );
    return success(res, {}, 'User deactivated');
  } catch (err) { next(err); }
};

// PATCH /api/users/push-token
const updatePushToken = async (req, res, next) => {
  try {
    const { push_token, device_id } = req.body;
    await db.query(
      `UPDATE user_sessions SET push_token = ?
       WHERE user_id = ? AND device_id = ? AND is_active = 1`,
      [push_token, req.user.user_id, device_id]
    );
    return success(res, {}, 'Push token updated');
  } catch (err) { next(err); }
};

module.exports = { getAllUsers, getUserById, createUser, updateUser, deleteUser, updatePushToken };
