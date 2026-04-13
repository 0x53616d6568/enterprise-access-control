const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

let transporter = null;

// Initialize Gmail OAuth2 transporter
const initializeEmailService = async () => {
  try {
    if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_REFRESH_TOKEN) {
      throw new Error('Gmail OAuth2 credentials not configured in .env');
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

    console.log('✅ Gmail OAuth2 email transporter ready:', process.env.GMAIL_USER);
  } catch (err) {
    console.error('❌ Email transporter error:', err.message);
    throw err;
  }
};

// Initialize on module load
initializeEmailService().catch(err => {
  console.error('Email service failed:', err.message);
});

/**
 * Send Password Reset Email
 * Generates a reset token and sends it to the user's email
 */
const sendPasswordResetEmail = async (userId, email, fullName) => {
  try {
    // Generate reset token (6-digit code for easy mobile typing)
    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store reset token in database
    await db.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at, is_used)
       VALUES (?, ?, ?, 0)
       ON DUPLICATE KEY UPDATE token = ?, expires_at = ?, is_used = 0`,
      [userId, resetToken, resetTokenExpiry, resetToken, resetTokenExpiry]
    );

    // Send email
    const mailOptions = {
      from: `"SecureApp EAC" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: '🔐 Password Reset - SecureApp EAC',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #0D1117; padding: 32px 20px; border-radius: 12px; color: #F0F6FC;">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="font-size: 32px; margin-bottom: 12px;">🔐</div>
              <h2 style="margin: 0; color: #2D7DD2; font-size: 24px;">Password Reset Request</h2>
            </div>

            <!-- Welcome -->
            <p style="margin: 0 0 16px 0; font-size: 16px;">Hello <strong>${fullName}</strong>,</p>
            <p style="margin: 0 0 24px 0; color: #8B949E;">
              We received a request to reset your password. Use the code below to reset your password in the SecureApp mobile app.
            </p>

            <!-- Reset Code Box -->
            <div style="background-color: #161B22; padding: 24px; border-radius: 8px; border: 2px solid #2D7DD2; text-align: center; margin: 32px 0;">
              <p style="margin: 0 0 8px 0; color: #8B949E; font-size: 12px; text-transform: uppercase;">Your Reset Code</p>
              <div style="font-family: 'Courier New', monospace; font-size: 36px; font-weight: bold; color: #58A6FF; letter-spacing: 4px; margin: 0;">
                ${resetToken}
              </div>
              <p style="margin: 12px 0 0 0; color: #8B949E; font-size: 12px;">Valid for 15 minutes</p>
            </div>

            <!-- Instructions -->
            <div style="background-color: #161B22; padding: 16px; border-radius: 8px; border-left: 4px solid #2D7DD2; margin: 24px 0;">
              <p style="margin: 0 0 8px 0; color: #58A6FF; font-weight: bold;">How to Reset Your Password:</p>
              <ol style="margin: 8px 0 0 20px; color: #8B949E; line-height: 1.8;">
                <li>Open the SecureApp mobile app</li>
                <li>Tap "Forgot Password" on the login screen</li>
                <li>Enter your email address and tap "Send Code"</li>
                <li>Enter the code above: <strong style="color: #58A6FF;">${resetToken}</strong></li>
                <li>Create your new password (minimum 8 characters)</li>
              </ol>
            </div>

            <!-- Security Notice -->
            <div style="background-color: rgba(200, 48, 48, 0.1); padding: 12px; border-radius: 8px; border-left: 4px solid #C53030; margin: 24px 0;">
              <p style="margin: 0; color: #8B949E; font-size: 12px;">
                <strong style="color: #C53030;">⚠️ Security Note:</strong> If you didn't request a password reset, please ignore this email. Your account is safe.
              </p>
            </div>

            <!-- Footer -->
            <p style="margin: 32px 0 0 0; padding-top: 16px; border-top: 1px solid #21262D; color: #8B949E; font-size: 12px; line-height: 1.6;">
              This is an automated message from SecureApp. Please do not reply to this email.<br/>
              For support, contact your administrator.
            </p>
            <p style="margin: 8px 0 0 0; color: #8B949E; font-size: 11px;">
              © 2024 SecureApp Enterprise Access Control
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent to ${email}`);
    return { success: true, message: 'Password reset code sent to your email' };

  } catch (err) {
    console.error('❌ Password reset email failed:', err.message);
    throw new Error('Failed to send password reset email');
  }
};

/**
 * Verify Password Reset Token
 * Checks if token is valid and not expired
 */
const verifyPasswordResetToken = async (userId, token) => {
  try {
    const [rows] = await db.query(
      `SELECT token_id FROM password_reset_tokens
       WHERE user_id = ? AND token = ? AND is_used = 0 AND expires_at > NOW()`,
      [userId, token]
    );

    return rows.length > 0;
  } catch (err) {
    console.error('Token verification failed:', err.message);
    throw err;
  }
};

/**
 * Reset Password Using Token
 * Marks token as used and updates user password
 */
const resetPasswordWithToken = async (userId, token, newPassword) => {
  try {
    // Verify token exists and is not used
    const [tokenRows] = await db.query(
      `SELECT token_id FROM password_reset_tokens
       WHERE user_id = ? AND token = ? AND is_used = 0 AND expires_at > NOW()`,
      [userId, token]
    );

    if (!tokenRows.length) {
      throw new Error('Invalid or expired reset token');
    }

    // Mark token as used
    await db.query(
      `UPDATE password_reset_tokens SET is_used = 1 WHERE user_id = ? AND token = ?`,
      [userId, token]
    );

    console.log(`✅ Password reset token marked as used for user ${userId}`);
    return { success: true };

  } catch (err) {
    console.error('Token usage failed:', err.message);
    throw err;
  }
};

module.exports = {
  sendPasswordResetEmail,
  verifyPasswordResetToken,
  resetPasswordWithToken,
};
