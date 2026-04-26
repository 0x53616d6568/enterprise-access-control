const bcrypt    = require('bcryptjs');
const nodemailer = require('nodemailer');
const db        = require('../config/db');
const { success, error } = require('../utils/response');

let transporter = null;

// Initialize Gmail OAuth2 transporter
const initializeEmailTransporter = async () => {
  try {
    if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_REFRESH_TOKEN) {
      throw new Error('Gmail OAuth2 not configured');
    }

    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.GMAIL_USER,
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
      },
    });

    console.log('✅ User controller email transporter ready');
  } catch (err) {
    console.error('❌ Email transporter init failed:', err.message);
  }
};

// Initialize on load
initializeEmailTransporter().catch(err => {
  console.error('❌ Failed to initialize email transporter:', err.message);
});
// Generate temp password
const generateTempPassword = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

// GET /api/users — Admin/Manager only
const getAllUsers = async (req, res, next) => {
  try {
    // If user is manager, only show their assigned team members
    if (req.user.access_level === 4) { // Manager role
      try {
        const [rows] = await db.query(
          `SELECT u.user_id, u.full_name, u.email, u.phone,
                  u.department, u.avatar_url, u.status,
                  u.is_first_login, u.last_login,
                  r.role_id, r.role_name, r.access_level
           FROM users u 
           JOIN roles r ON u.role_id = r.role_id
           LEFT JOIN manager_team_members mtm ON u.user_id = mtm.team_member_id AND mtm.manager_id = ?
           WHERE mtm.manager_id = ?
           ORDER BY u.full_name`,
          [req.user.user_id, req.user.user_id]
        );
        console.log(`[Manager Team] Retrieved ${rows.length} team members for manager ${req.user.user_id}`);
        return success(res, rows);
      } catch (tableErr) {
        // If manager_team_members table doesn't exist or query fails, return empty array
        console.warn(`[Manager Team] Failed to fetch team members (table may not exist):`, tableErr.message);
        return success(res, [], 'No team members assigned');
      }
    }
    
    // If admin, show all users
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
    try {
      await transporter.sendMail({
        from:    `"SecureApp EAC" <${process.env.GMAIL_USER}>`,
        to:      email,
        subject: '🔐 Welcome to SecureApp — Your Account is Ready',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #0D1117; padding: 32px 20px; border-radius: 12px; color: #F0F6FC;">
              <!-- Header -->
              <div style="text-align: center; margin-bottom: 32px;">
                <div style="font-size: 32px; margin-bottom: 12px;">🔐</div>
                <h2 style="margin: 0; color: #2D7DD2; font-size: 24px;">Welcome to SecureApp!</h2>
              </div>

              <!-- Welcome Message -->
              <p style="margin: 0 0 16px 0; font-size: 16px;">Hello <strong>${full_name}</strong>,</p>
              <p style="margin: 0 0 24px 0; color: #8B949E;">
                Your enterprise access control account has been successfully created. You can now log in to access the system.
              </p>

              <!-- Credentials Box -->
              <div style="background-color: #161B22; padding: 24px; border-radius: 8px; border: 2px solid #2D7DD2; margin: 32px 0;">
                <p style="margin: 0 0 12px 0; color: #8B949E; font-size: 12px; text-transform: uppercase;">Login Credentials</p>
                
                <div style="margin: 12px 0;">
                  <p style="margin: 0 0 6px 0; color: #58A6FF; font-size: 12px;">Email Address</p>
                  <p style="margin: 0; font-family: 'Courier New', monospace; background-color: #0D1117; padding: 8px 12px; border-radius: 4px; word-break: break-all;">
                    <strong>${email}</strong>
                  </p>
                </div>

                <div style="margin: 16px 0;">
                  <p style="margin: 0 0 6px 0; color: #58A6FF; font-size: 12px;">Temporary Password</p>
                  <p style="margin: 0; font-family: 'Courier New', monospace; background-color: #0D1117; padding: 8px 12px; border-radius: 4px; word-break: break-all; font-size: 14px; letter-spacing: 1px;">
                    <strong>${tempPassword}</strong>
                  </p>
                </div>
              </div>

              <!-- Important Notice -->
              <div style="background-color: rgba(200, 48, 48, 0.1); padding: 16px; border-radius: 8px; border-left: 4px solid #C53030; margin: 24px 0;">
                <p style="margin: 0; color: #8B949E;">
                  <strong style="color: #C53030;">⚠️ Important:</strong> You will be required to change your password on first login. Keep this temporary password safe and confidential.
                </p>
              </div>

              <!-- Login Instructions -->
              <div style="background-color: #161B22; padding: 16px; border-radius: 8px; margin: 24px 0;">
                <p style="margin: 0 0 12px 0; color: #58A6FF; font-weight: bold;">3 Steps to Get Started:</p>
                <ol style="margin: 8px 0 0 20px; color: #8B949E; line-height: 1.8;">
                  <li>Download or open the SecureApp mobile application</li>
                  <li>Log in with the credentials above</li>
                  <li>Change your password when prompted (minimum 8 characters)</li>
                </ol>
              </div>

              <!-- Support -->
              <p style="margin: 32px 0 0 0; padding-top: 16px; border-top: 1px solid #21262D; color: #8B949E; font-size: 12px; line-height: 1.6;">
                If you encounter any issues logging in or have questions, please contact your system administrator.<br/>
                <strong style="color: #58A6FF;">Administrator Email:</strong> ${process.env.ADMIN_EMAIL || 'admin@secureapp.local'}
              </p>
              
              <p style="margin: 8px 0 0 0; color: #8B949E; font-size: 11px;">
                © 2024 SecureApp Enterprise Access Control
              </p>
            </div>
          </div>
        `,
      });
      console.log(`✅ Welcome email sent to ${email}`);
    } catch (emailErr) {
      console.error(`⚠️ Email sending failed for ${email}:`, emailErr.message);
      // Don't fail the entire user creation if email fails
    }

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
    
    // Build update query dynamically based on provided fields
    const updates = [];
    const values = [];
    
    if (full_name !== undefined) {
      updates.push('full_name = ?');
      values.push(full_name);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone);
    }
    if (department !== undefined) {
      updates.push('department = ?');
      values.push(department);
    }
    if (avatar_url !== undefined) {
      updates.push('avatar_url = ?');
      values.push(avatar_url);
    }
    
    if (updates.length === 0) {
      return error(res, 'No fields to update', 400);
    }
    
    values.push(id);
    
    await db.query(
      `UPDATE users SET ${updates.join(', ')} WHERE user_id = ?`,
      values
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

// POST /api/users/push-token - Save push notification token
const updatePushToken = async (req, res, next) => {
  try {
    const { push_token } = req.body;
    
    if (!push_token) {
      return error(res, 'Push token is required', 400);
    }

    // Store push token in users table for simplicity
    // Alternative: you could create a separate device_tokens table
    await db.query(
      `UPDATE users SET push_token = ? WHERE user_id = ?`,
      [push_token, req.user.user_id]
    );

    console.log(`✅ Push token saved for user ${req.user.user_id}`);
    return success(res, {}, 'Push token saved');
  } catch (err) { 
    console.error('Error saving push token:', err);
    next(err); 
  }
};

module.exports = { getAllUsers, getUserById, createUser, updateUser, deleteUser, updatePushToken };
