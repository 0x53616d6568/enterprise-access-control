/**
 * Gmail API Service
 * Replaces SMTP with Gmail REST API for reliable email delivery on Render
 * Uses HTTPS (port 443) instead of SMTP (port 587) to avoid firewall blocking
 * Auto-refreshes OAuth2 access tokens
 */

const { google } = require('googleapis');
const db = require('../config/db');

// ─────────────────────────────────────────────────────────────────
// Gmail OAuth2 Setup
// ─────────────────────────────────────────────────────────────────

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI
);

// Set credentials using existing refresh token
if (process.env.GMAIL_REFRESH_TOKEN) {
  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN
  });
  console.log('✅ Gmail API OAuth2 configured with refresh token');
}

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

// ─────────────────────────────────────────────────────────────────
// MIME Message Builder
// ─────────────────────────────────────────────────────────────────

function createRawMessage({ to, subject, htmlBody, textBody }) {
  const boundary = `__boundary_${Date.now()}__`;
  const from = process.env.GMAIL_FROM || process.env.GMAIL_USER || 'noreply@secureapp.com';

  // RFC 2047 encode the subject line for UTF-8 support (emoji, special chars)
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, 'utf-8').toString('base64')}?=`;

  const messageParts = [
    `MIME-Version: 1.0`,
    `To: ${to}`,
    `From: "SecureApp EAC" <${from}>`,
    `Subject: ${encodedSubject}`,
    `Content-Type: multipart/alternative; charset="UTF-8"; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: quoted-printable`,
    ``,
    textBody,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: quoted-printable`,
    ``,
    htmlBody,
    ``,
    `--${boundary}--`
  ];

  const encoded = Buffer.from(messageParts.join('\r\n'), 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return encoded;
}

// ─────────────────────────────────────────────────────────────────
// Core Send Function
// ─────────────────────────────────────────────────────────────────

async function sendMail({ to, subject, textBody, htmlBody }) {
  if (!to || !subject) {
    throw new Error('Recipient (to) and subject are required');
  }

  if (!process.env.GMAIL_REFRESH_TOKEN) {
    throw new Error('Gmail refresh token not configured in .env');
  }

  try {
    // Auto-refresh access token if expired
    const { token } = await oauth2Client.getAccessToken();

    if (!token) {
      throw new Error('Failed to retrieve access token. Check your refresh token.');
    }

    const raw = createRawMessage({ to, subject, htmlBody, textBody });

    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw }
    });

    console.log(`✅ [GMAIL API] Email sent to ${to} | Message ID: ${res.data.id}`);
    return { success: true, messageId: res.data.id };

  } catch (error) {
    console.error(`❌ [GMAIL API] Failed to send to ${to}:`, error.message);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────
// Email Templates
// ─────────────────────────────────────────────────────────────────

/**
 * Send Password Reset Email
 */
const sendPasswordResetEmail = async (userId, email, fullName) => {
  try {
    // Generate reset token (6-digit code)
    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store reset token in database
    await db.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at, is_used)
       VALUES (?, ?, ?, 0)
       ON DUPLICATE KEY UPDATE token = ?, expires_at = ?, is_used = 0`,
      [userId, resetToken, resetTokenExpiry, resetToken, resetTokenExpiry]
    );

    const textBody = `Hi ${fullName},\n\nYour password reset code is: ${resetToken}\n\nThis code is valid for 15 minutes.\n\nIf you didn't request this, please ignore this email.\n\nSecureApp Team`;

    const htmlBody = `
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
    `;

    await sendMail({
      to: email,
      subject: '🔐 Password Reset - SecureApp EAC',
      textBody,
      htmlBody
    });

    console.log(`✅ Password reset email sent to ${email}`);
    return { success: true, message: 'Password reset code sent to your email' };

  } catch (err) {
    console.error('❌ Password reset email failed:', err.message);
    throw new Error(`Failed to send password reset email: ${err.message}`);
  }
};

/**
 * Verify Password Reset Token
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
 */
const resetPasswordWithToken = async (userId, token, newPassword) => {
  try {
    const [tokenRows] = await db.query(
      `SELECT token_id FROM password_reset_tokens
       WHERE user_id = ? AND token = ? AND is_used = 0 AND expires_at > NOW()`,
      [userId, token]
    );

    if (!tokenRows.length) {
      throw new Error('Invalid or expired reset token');
    }

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

/**
 * Send Welcome Email to New User
 */
const sendWelcomeEmail = async (userId, email, fullName, tempPassword) => {
  try {
    console.log(`📧 [WELCOME EMAIL] Sending to ${email}...`);

    const textBody = `Hi ${fullName},\n\nWelcome to SecureApp Enterprise Access Control!\n\nEmail: ${email}\nTemporary Password: ${tempPassword}\n\nPlease log in and change your password immediately.\n\nSecureApp Team`;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #0D1117; padding: 32px 20px; border-radius: 12px; color: #F0F6FC;">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="font-size: 32px; margin-bottom: 12px;">🔐</div>
            <h2 style="margin: 0; color: #2D7DD2; font-size: 24px;">Welcome to SecureApp!</h2>
          </div>

          <!-- Welcome Message -->
          <p style="margin: 0 0 16px 0; font-size: 16px;">Hello <strong>${fullName}</strong>,</p>
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
            <p style="margin: 0; color: #8B949E; font-size: 12px;">
              <strong style="color: #C53030;">⚠️ Important:</strong> This is a temporary password. Log in immediately and change your password to something secure.
            </p>
          </div>

          <!-- Getting Started -->
          <div style="background-color: #161B22; padding: 16px; border-radius: 8px; border-left: 4px solid #58A6FF; margin: 24px 0;">
            <p style="margin: 0 0 8px 0; color: #58A6FF; font-weight: bold;">Next Steps:</p>
            <ul style="margin: 8px 0 0 20px; color: #8B949E; line-height: 1.8;">
              <li>Download the SecureApp mobile app from your app store</li>
              <li>Log in with your email and temporary password</li>
              <li>Update your password in account settings</li>
              <li>Enable biometric authentication for secure access</li>
            </ul>
          </div>

          <!-- Support -->
          <div style="margin: 24px 0; padding: 16px; background-color: #161B22; border-radius: 8px;">
            <p style="margin: 0; color: #8B949E; font-size: 12px; line-height: 1.6;">
              <strong style="color: #58A6FF;">Need Help?</strong><br/>
              If you encounter any issues, please contact your system administrator or email support@secureapp.com
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
    `;

    await sendMail({
      to: email,
      subject: '🔐 Welcome to SecureApp — Your Account is Ready',
      textBody,
      htmlBody
    });

    console.log(`✅ Welcome email sent to ${email}`);
    return { success: true, message: 'Welcome email sent successfully' };

  } catch (err) {
    console.error('❌ Welcome email failed:', err.message);
    throw new Error(`Failed to send welcome email: ${err.message}`);
  }
};

// ─────────────────────────────────────────────────────────────────
// Export Service
// ─────────────────────────────────────────────────────────────────

module.exports = {
  sendPasswordResetEmail,
  sendWelcomeEmail,
  verifyPasswordResetToken,
  resetPasswordWithToken,
  sendMail, // For custom emails if needed
};
